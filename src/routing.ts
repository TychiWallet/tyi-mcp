/** Host-agent routing — pick direct MCP tools; avoid tyi_chat for wallet ops. */
export function buildRoutingGuide(): object {
  return {
    version: 1,
    rule: "Direct MCP tools first. tyi_chat last — slow brain loop.",
    routes: [
      {
        intents: ["first setup", "no wallet", "onboard", "install"],
        tool: "tyi_onboard",
        not: "tyi_chat",
      },
      {
        intents: ["create wallet", "new wallet", "add wallet"],
        tool: "tyi_create_wallet",
        not: "tyi_chat",
        needs: ["name"],
      },
      {
        intents: ["import wallet", "restore seed", "import mnemonic", "import private key"],
        tool: "tyi_import_wallet",
        not: "tyi_chat",
        needs: ["name", "kind", "secret from operator"],
      },
      {
        intents: ["switch wallet", "use wallet", "change active wallet"],
        tool: "tyi_switch_wallet",
        not: "tyi_chat",
        needs: ["name"],
      },
      {
        intents: ["delete all data", "reset wallet", "remove tychi"],
        tool: "tyi_reset",
        not: "tyi_chat",
      },
      {
        intents: ["balance", "send", "pay", "transfer", "swap", "policy", "limits", "history"],
        tool: "tyi_chat",
      },
    ],
  };
}

export const TOOL_ROUTING_HINTS = {
  tyi_route:
    "READ FIRST. Intent → tool map. Call before any wallet op. Prevents slow tyi_chat misuse.",
  tyi_status: "Check ready + missing. Call once at session start.",
  tyi_onboard: "FAST. First-time setup only. NOT tyi_chat.",
  tyi_create_wallet: "FAST. New wallet by name. User said create/new wallet → call this NOT tyi_chat.",
  tyi_import_wallet:
    "FAST. Import seed/privkey. User said import/restore → call this NOT tyi_chat. Secret via tool param only.",
  tyi_switch_wallet: "FAST. Set active wallet by name. NOT tyi_chat.",
  tyi_reset: "Wipe ~/.tyi. confirm:true required. NOT tyi_chat.",
  tyi_chat:
    "SLOW brain agent. ONLY: balance, send, pay, transfer, policy, limits, history, general Q. " +
    "NEVER: create wallet, import, onboard, reset, switch — use dedicated tyi_* tools instead.",
} as const;
