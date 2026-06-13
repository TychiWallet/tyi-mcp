# Tychi MCP (`@tychilabs/tyi-mcp`)

[![npm](https://img.shields.io/npm/v/@tychilabs/tyi-mcp?label=npm&tag=beta)](https://www.npmjs.com/package/@tychilabs/tyi-mcp)
[![beta](https://img.shields.io/badge/status-v1.0%20beta-orange)](https://www.npmjs.com/package/@tychilabs/tyi-mcp)
[![node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![mcp](https://img.shields.io/badge/MCP-stdio-8b5cf6)](https://modelcontextprotocol.io)
[![chain](https://img.shields.io/badge/chain-Arbitrum-28A0F0?logo=arbitrum&logoColor=white)](https://arbitrum.io)
[![custody](https://img.shields.io/badge/custody-self--custody-2b8a3e)](https://tychilabs.com)
[![website](https://img.shields.io/badge/website-tychilabs.com-blue)](https://tychilabs.com)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue)](https://opensource.org/licenses/Apache-2.0)

**Audience:** MCP host agents (OpenClaw, Claude Desktop, Cursor, Codex).  
**Not for humans.** Human CLI: [`@tychilabs/tyi`](https://www.npmjs.com/package/@tychilabs/tyi).

Self-custody wallet MCP. Keys in `~/.tyi`. Brain at `http://hosted_brain.tychilabs.com`. Signing local only.

![Tychi agent wallet architecture](https://unpkg.com/@tychilabs/tyi-mcp@beta/architecture.png)

---

## Mandatory flow

```
tyi_route → tyi_status
  → direct tool (create/import/switch/onboard/reset)   ← FAST, no brain
  → tyi_chat only for balance/send/policy              ← SLOW
```

Never call `tyi_chat` when `tyi_status.ready` is false.

**Import additional wallet:** collect seed/privkey from operator → `tyi_import_wallet` — never via `tyi_chat`.

---

## Upcoming on Arbitrum One

Onchain DeFi for your agent wallet — same self-custody, same local signing, built for **Arbitrum One**:

| Coming | What it unlocks |
|--------|-----------------|
| **Automation** | Policy-gated agents that act onchain 24/7 — recurring sends, triggers, scheduled flows |
| **Trading** | Spot swaps and routing across Arbitrum liquidity — agent quotes, you confirm, sign locally |
| **Lending** | Supply assets on Arbitrum money markets — earn yield without leaving your keystore |
| **Borrowing** | Collateralized borrow onchain — agent-assisted, cap-enforced, fully self-custodial |

Native Arbitrum execution. UGF gas routing today. Full DeFi stack next.

---

| Brain action | MCP tool | Status |
|--------------|----------|--------|
| `import_wallet` | `tyi_import_wallet` | done |
| `create_wallet` | `tyi_create_wallet` | done |
| `switch_wallet` | `tyi_switch_wallet` | done |
| `reveal_wallet` | `tyi_reveal_wallet` | missing |

---

## Tools

| Tool | When |
|------|------|
| `tyi_route` | **First** — intent → tool map |
| `tyi_create_wallet` | User wants new wallet → **not** `tyi_chat` |
| `tyi_import_wallet` | User wants import → **not** `tyi_chat` |
| `tyi_switch_wallet` | Change active wallet → **not** `tyi_chat` |
| `tyi_onboard` | First setup |
| `tyi_chat` | Balance, send, pay, policy only |

---

## Operator prompts (you ask human; never invent secrets)

| Field | Prompt |
|-------|--------|
| `password` | Keystore password for `~/.tyi` → later `TYI_PASSWORD` in MCP env |
| `agent_name` | Agent name (default `Tychi`) |
| `llm_provider` | `anthropic` \| `gemini` \| `openai` \| `groq` |
| `llm_api_key` | Provider API key (validated, stored encrypted on brain) |
| `mnemonic` | Optional import (fresh only) |

Prefer MCP `env` for `TYI_PASSWORD` over chat after onboard.

---

## Modes (`tyi_status.mode`)

| Mode | Meaning | `tyi_onboard` needs |
|------|---------|---------------------|
| `fresh` | No wallet / incomplete | `password`, `llm_provider`, `llm_api_key`; optional `agent_name`, `mnemonic` |
| `llm_only` | Wallet exists, no LLM vault | Same LLM fields + `password` |
| `ready` | OK for chat | Do not onboard; use `tyi_chat` |

---

## MCP host config

```json
{
  "tychi": {
    "command": "npx",
    "args": ["-y", "@tychilabs/tyi-mcp@beta"],
    "env": {
      "TYI_PASSWORD": "<from tyi_onboard>",
      "TYCHI_BRAIN_URL": "http://hosted_brain.tychilabs.com"
    }
  }
}
```

OpenClaw set:

```bash
openclaw mcp set tychi '{"command":"npx","args":["-y","@tychilabs/tyi-mcp@beta"],"env":{"TYI_PASSWORD":"<password>","TYCHI_BRAIN_URL":"http://hosted_brain.tychilabs.com"}}'
openclaw mcp reload
```

---

## Remove integration + data

1. `tyi_reset` with `{ "confirm": true }` — wipes `~/.tyi`
2. Remove `TYI_PASSWORD` from MCP env
3. OpenClaw: `openclaw mcp unset tychi` then `openclaw mcp reload`

---

## Errors

| Symptom | Action |
|---------|--------|
| `not_ready` on chat | Run onboard flow |
| `TYI_PASSWORD env required` | Set env after onboard; reload host |
| `no_llm_key` / missing `llm_key` | `tyi_onboard` llm_only |
| `partial install` | `tyi_reset` then fresh onboard |
| `fetch failed` on brain | Use `http://` not `https://` for hosted brain |

---

## Env

| Var | Required | Default |
|-----|----------|---------|
| `TYI_PASSWORD` | After onboard, for chat | — |
| `TYCHI_BRAIN_URL` | No | `http://hosted_brain.tychilabs.com` |
| `TYI_DATA_DIR` | No | `~/.tyi` |
| `KEYSTORE_PASSWORD` | Alias for `TYI_PASSWORD` | — |

---

## Install

```bash
npx -y @tychilabs/tyi-mcp@beta
npx @tychilabs/tyi-mcp@beta --tools
```

## License

Apache License 2.0 — see [LICENSE](./LICENSE). Runtime dependency: `@tychilabs/tyi`.
