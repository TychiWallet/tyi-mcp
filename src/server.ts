import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { brainChatTurn, createTyiClient, resetBrainHistory } from "@tychilabs/tyi";
import { runCreateWallet } from "./create-wallet.js";
import { runImportWallet } from "./import-wallet.js";
import { buildOnboardSchema, runAgentOnboard } from "./onboard.js";
import { getReadiness } from "./readiness.js";
import { resetTyiData } from "./reset.js";
import { buildRoutingGuide, TOOL_ROUTING_HINTS } from "./routing.js";
import { runSwitchWallet } from "./switch-wallet.js";

let unlockedClient: ReturnType<typeof createTyiClient> | null = null;

async function ensureUnlockedForChat(): Promise<void> {
  if (unlockedClient?.isUnlocked) return;
  const pw = process.env.TYI_PASSWORD ?? process.env.KEYSTORE_PASSWORD;
  if (!pw?.trim()) {
    throw new Error("TYI_PASSWORD env required — set in MCP host config after tyi_onboard");
  }
  unlockedClient = createTyiClient();
  await unlockedClient.unlock(pw.trim());
}

function walletToolError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: msg }], isError: true as const };
}

export function createAgentMcpServer(): McpServer {
  const server = new McpServer({
    name: "tyi-mcp",
    version: "1.0.0-beta.8",
  });

  server.registerTool(
    "tyi_route",
    {
      description: TOOL_ROUTING_HINTS.tyi_route,
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text" as const, text: JSON.stringify(buildRoutingGuide(), null, 2) }],
    }),
  );

  server.registerTool(
    "tyi_status",
    {
      description: TOOL_ROUTING_HINTS.tyi_status,
      inputSchema: {},
    },
    async () => {
      const status = await getReadiness();
      return { content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }] };
    },
  );

  server.registerTool(
    "tyi_onboard_schema",
    {
      description: "Onboarding field schema. Use with tyi_onboard — not tyi_chat.",
      inputSchema: {},
    },
    async () => {
      const status = await getReadiness();
      const schema = buildOnboardSchema();
      return {
        content: [
          { type: "text" as const, text: JSON.stringify({ current_status: status, schema }, null, 2) },
        ],
      };
    },
  );

  server.registerTool(
    "tyi_onboard",
    {
      description: TOOL_ROUTING_HINTS.tyi_onboard,
      inputSchema: {
        password: z.string().describe("Keystore password (operator-provided)"),
        llm_provider: z.enum(["anthropic", "gemini", "openai", "groq"]),
        llm_api_key: z.string().describe("Provider API key"),
        agent_name: z.string().optional(),
        mnemonic: z.string().optional().describe("Optional BIP39 import (fresh only)"),
      },
    },
    async (input) => {
      try {
        const result = await runAgentOnboard(input);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return walletToolError(err);
      }
    },
  );

  server.registerTool(
    "tyi_create_wallet",
    {
      description: TOOL_ROUTING_HINTS.tyi_create_wallet,
      inputSchema: {
        name: z.string().describe("New wallet name"),
        label: z.string().optional().describe("Display label"),
      },
    },
    async (input) => {
      const status = await getReadiness();
      if (status.missing.includes("keystore")) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "no_keystore", hint: "tyi_onboard first" }, null, 2),
            },
          ],
          isError: true,
        };
      }
      try {
        const result = await runCreateWallet(input);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return walletToolError(err);
      }
    },
  );

  server.registerTool(
    "tyi_import_wallet",
    {
      description: TOOL_ROUTING_HINTS.tyi_import_wallet,
      inputSchema: {
        name: z.string().describe("New wallet name"),
        kind: z.enum(["mnemonic", "evm_privkey", "sol_privkey", "sui_privkey"]),
        secret: z.string().describe("Seed or private key — operator only, never tyi_chat"),
        label: z.string().optional(),
      },
    },
    async (input) => {
      const status = await getReadiness();
      if (status.missing.includes("keystore")) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "no_keystore", hint: "tyi_onboard first" }, null, 2),
            },
          ],
          isError: true,
        };
      }
      try {
        const result = await runImportWallet(input);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return walletToolError(err);
      }
    },
  );

  server.registerTool(
    "tyi_switch_wallet",
    {
      description: TOOL_ROUTING_HINTS.tyi_switch_wallet,
      inputSchema: {
        name: z.string().describe("Wallet name to activate"),
      },
    },
    async ({ name }) => {
      try {
        const result = await runSwitchWallet(name);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return walletToolError(err);
      }
    },
  );

  server.registerTool(
    "tyi_reset",
    {
      description: TOOL_ROUTING_HINTS.tyi_reset,
      inputSchema: {
        confirm: z.boolean().describe("Must be true"),
      },
    },
    async ({ confirm }) => {
      try {
        unlockedClient = null;
        const result = resetTyiData(confirm);
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return walletToolError(err);
      }
    },
  );

  server.registerTool(
    "tyi_chat",
    {
      description: TOOL_ROUTING_HINTS.tyi_chat,
      inputSchema: {
        message: z.string().describe("Balance, send, pay, policy — not create/import/onboard"),
        reset: z.boolean().optional(),
      },
    },
    async ({ message, reset }) => {
      const text = message?.trim();
      if (!text) {
        return {
          content: [{ type: "text" as const, text: "Error: message is required" }],
          isError: true,
        };
      }

      const status = await getReadiness();
      if (!status.ready) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { error: "not_ready", missing: status.missing, hint: "tyi_onboard first" },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      if (reset) resetBrainHistory();
      try {
        await ensureUnlockedForChat();
        const reply = await brainChatTurn(text, "mcp");
        return { content: [{ type: "text" as const, text: reply || "(no reply)" }] };
      } catch (err) {
        return walletToolError(err);
      }
    },
  );

  return server;
}
