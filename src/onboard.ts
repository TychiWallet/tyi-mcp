import {
  createTyiIdentity,
  createWalletForKinds,
  ensureDirs,
  importMnemonicForKinds,
  keystoreExists,
  loadWallet,
  PRIMARY_WALLET_NAME,
  setCurrentPassword,
  validateAnthropic,
  validateGemini,
  validateGroq,
  validateOpenAi,
  writeAgentConfig,
} from "@tychilabs/tyi";
import { loadSupportedChains, supportedChainKinds, formatSupportedChainsLine } from "./chains.js";
import { brainSaveLlmKey } from "./brain-llm.js";
import { getReadiness } from "./readiness.js";
import type { LlmProvider, OnboardInput } from "./types.js";

async function validateLlmKey(provider: LlmProvider, key: string): Promise<boolean> {
  if (provider === "gemini") return validateGemini(key);
  if (provider === "openai") return validateOpenAi(key);
  if (provider === "groq") return validateGroq(key);
  return validateAnthropic(key);
}

export type OnboardResult = {
  ok: true;
  mode: "fresh" | "llm_only";
  agent_name: string;
  chains: string;
  evm_address: string | null;
  sol_address: string | null;
  sui_address: string | null;
  /** Returned once on fresh create/import — operator must store offline. Never logged by host. */
  mnemonic?: string;
  next_steps: string[];
};

export async function runAgentOnboard(input: OnboardInput): Promise<OnboardResult> {
  const password = input.password?.trim();
  if (!password) throw new Error("password is required");

  const provider = input.llm_provider;
  if (!["anthropic", "gemini", "openai", "groq"].includes(provider)) {
    throw new Error("llm_provider must be anthropic | gemini | openai | groq");
  }

  const apiKey = input.llm_api_key?.trim();
  if (!apiKey) throw new Error("llm_api_key is required");

  const valid = await validateLlmKey(provider, apiKey);
  if (!valid) throw new Error(`invalid ${provider} API key`);

  const status = await getReadiness();
  const agentName = (input.agent_name?.trim() || "Tychi").slice(0, 64);

  await loadSupportedChains();
  const kinds = supportedChainKinds();
  const chainsLine = formatSupportedChainsLine();

  if (status.mode === "llm_only") {
    if (!keystoreExists()) throw new Error("no keystore — use fresh onboarding");
    await loadWallet(password);
    setCurrentPassword(password);
    await brainSaveLlmKey(password, provider, apiKey);
    return {
      ok: true,
      mode: "llm_only",
      agent_name: agentName,
      chains: chainsLine,
      evm_address: status.wallet?.evm_address ?? null,
      sol_address: status.wallet?.sol_address ?? null,
      sui_address: status.wallet?.sui_address ?? null,
      next_steps: [
        "Set TYI_PASSWORD in MCP host env to this password.",
        "Call tyi_status — ready must be true.",
        "Then tyi_chat.",
      ],
    };
  }

  if (status.mode === "ready") {
    throw new Error("already onboarded — tyi_status.ready is true; use tyi_reset to wipe first");
  }

  if (keystoreExists()) {
    throw new Error("partial install detected — tyi_reset then tyi_onboard fresh");
  }

  ensureDirs();

  let mnemonic: string | undefined;
  let evmAddress: string | null = null;
  let solAddress: string | null = null;
  let suiAddress: string | null = null;

  if (input.mnemonic?.trim()) {
    const addrs = importMnemonicForKinds(
      PRIMARY_WALLET_NAME,
      "Primary",
      input.mnemonic.trim(),
      password,
      kinds,
    );
    evmAddress = addrs.evmAddress ?? null;
    solAddress = addrs.solAddress ?? null;
    suiAddress = addrs.suiAddress ?? null;
  } else {
    const out = createWalletForKinds(PRIMARY_WALLET_NAME, "Primary", password, kinds);
    mnemonic = out.mnemonic;
    evmAddress = out.evmAddress ?? null;
    solAddress = out.solAddress ?? null;
    suiAddress = out.suiAddress ?? null;
  }

  createTyiIdentity(password);
  await loadWallet(password);
  setCurrentPassword(password);
  await brainSaveLlmKey(password, provider, apiKey);

  writeAgentConfig({
    agentName,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    memory: { notes: [] },
    history: [],
  });

  return {
    ok: true,
    mode: "fresh",
    agent_name: agentName,
    chains: chainsLine,
    evm_address: evmAddress,
    sol_address: solAddress,
    sui_address: suiAddress,
    mnemonic,
    next_steps: [
      "If mnemonic present: tell operator to write it offline now — it will not repeat.",
      "Set TYI_PASSWORD in MCP host env to the onboarding password.",
      "Reload MCP host config.",
      "Call tyi_status — ready must be true.",
      "Then tyi_chat.",
    ],
  };
}

export function buildOnboardSchema(): object {
  return {
    version: 1,
    audience: "mcp_host_agent",
    flow: [
      "1. tyi_status — read ready + missing + mode",
      "2. tyi_onboard_schema — fields for current mode",
      "3. Ask OPERATOR (human) for secrets — never invent password/LLM key",
      "4. tyi_onboard — one shot with collected fields",
      "5. tyi_status — verify ready:true",
      "6. tyi_chat — wallet agent",
    ],
    operator_prompts: {
      password: "Choose a keystore password for ~/.tyi (min 1 char). You will add it as TYI_PASSWORD in MCP env.",
      agent_name: "What name should the wallet agent use? (default: Tychi)",
      llm_provider: "LLM provider: anthropic | gemini | openai | groq",
      llm_api_key: "Paste API key for chosen provider (validated before save)",
      mnemonic: "Optional: existing BIP39 mnemonic to import instead of new wallet",
    },
    modes: {
      fresh: {
        when: "tyi_status.mode === fresh",
        required: ["password", "llm_provider", "llm_api_key"],
        optional: ["agent_name", "mnemonic"],
      },
      llm_only: {
        when: "tyi_status.mode === llm_only (wallet exists, LLM missing)",
        required: ["password", "llm_provider", "llm_api_key"],
        optional: ["agent_name"],
      },
    },
    env_after_onboard: {
      TYI_PASSWORD: "same password used in tyi_onboard",
      TYCHI_BRAIN_URL: "HTTPS brain URL (required for production; beta default is HTTP — see SECURITY.md)",
    },
    fields: {
      password: { type: "string", secret: true },
      agent_name: { type: "string", default: "Tychi" },
      llm_provider: { type: "enum", values: ["anthropic", "gemini", "openai", "groq"] },
      llm_api_key: { type: "string", secret: true },
      mnemonic: { type: "string", secret: true, optional: true },
    },
  };
}
