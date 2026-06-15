# Security — Tychi MCP

Legitimate self-custody wallet MCP. **No** `preinstall` / `postinstall` scripts. **No** prompt-injection in tool descriptions.

## Trust model

| Data | Where it lives | Notes |
|------|----------------|-------|
| Private keys / mnemonics | Operator machine (`~/.tyi`, encrypted) | Imported via `tyi_import_wallet` only; never sent to brain |
| Signing | Local only | Brain returns intents/actions; MCP signs on device |
| LLM provider API key | Hosted brain (encrypted vault) | Required for `tyi_chat`; not stored in MCP repo |
| Brain JWT | `~/.tyi/.brain-jwt.json` (mode 600) | Cached after wallet auth |

## Brain transport (HTTP)

Default hosted brain: `http://hosted_brain.tychilabs.com` (beta — TLS not available on this hostname).

**Risk:** LLM API keys and auth JWTs traverse the network in cleartext unless you override the endpoint.

**Mitigations:**

1. Set `TYCHI_BRAIN_URL` to your own brain over **HTTPS** (self-hosted or reverse proxy).
2. Run brain on `127.0.0.1` for local-only use.
3. Do not use on untrusted networks until HTTPS endpoint is available.

## Sensitive MCP tools

- `tyi_import_wallet` — accepts mnemonic or private key in tool args (high trust). Use only in a trusted host; prefer env-based password via `TYI_PASSWORD`.
- `tyi_onboard` — collects password and optional mnemonic; LLM key sent to brain over configured `TYCHI_BRAIN_URL`.

Never pass wallet secrets through `tyi_chat`.

## Supply chain

- Install pinned release: `@tychilabs/tyi-mcp@1.0.0-beta.8` (avoid floating `@beta` in production).
- Runtime: `@tychilabs/tyi@1.0.0-beta.4` (Apache-2.0, [TychiWallet/tyi-mcp](https://github.com/TychiWallet/tyi-mcp)).
- Verify checksum on npm before deploy in high-assurance environments.

## Reporting

Security issues: **yash@tychilabs.com**
