#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runAgentMcpServer } from "./boot.js";

const argv = process.argv.slice(2);

function printHelp(): void {
  process.stdout.write(
    `@tychilabs/tyi-mcp — agent-native Tychi wallet MCP\n\n` +
      `USAGE:\n` +
      `  npx @tychilabs/tyi-mcp@1.0.0-beta.7           run stdio MCP server\n` +
      `  npx @tychilabs/tyi-mcp@1.0.0-beta.7 --tools   list tools\n` +
      `  npx @tychilabs/tyi-mcp@1.0.0-beta.7 --help    this help\n\n` +
      `AGENT FLOW:\n` +
      `  tyi_status → tyi_onboard_schema → tyi_onboard → tyi_status → tyi_chat\n\n` +
      `MCP HOST CONFIG:\n` +
      `  "tychi": {\n` +
      `    "command": "npx",\n` +
      `    "args": ["@tychilabs/tyi-mcp@1.0.0-beta.7"],\n` +
      `    "env": {\n` +
      `      "TYI_PASSWORD": "<after tyi_onboard>",\n` +
      `      "TYCHI_BRAIN_URL": "<https brain URL — see SECURITY.md>"\n` +
      `    }\n` +
      `  }\n`,
  );
}

function printTools(): void {
  process.stdout.write(
    `Registered tools (9):\n\n` +
      `  tyi_route           intent → tool map (call first)\n` +
      `  tyi_status          ready gate\n` +
      `  tyi_onboard_schema  onboard fields\n` +
      `  tyi_onboard         first-time setup\n` +
      `  tyi_create_wallet   FAST new wallet\n` +
      `  tyi_import_wallet   FAST import seed/privkey\n` +
      `  tyi_switch_wallet   FAST switch active wallet\n` +
      `  tyi_reset           wipe ~/.tyi\n` +
      `  tyi_chat            SLOW — balance/send/policy only\n\n`,
  );
}

function printVersion(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")) as {
    name: string;
    version: string;
    dependencies?: Record<string, string>;
  };
  process.stdout.write(`${pkg.name} v${pkg.version}\n`);
  process.stdout.write(`wallet: @tychilabs/tyi ${pkg.dependencies?.["@tychilabs/tyi"] ?? "?"}\n`);
}

if (argv.includes("--help") || argv.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (argv.includes("--tools") || argv.includes("--list-tools")) {
  printTools();
  process.exit(0);
}

if (argv.includes("--version") || argv.includes("-v")) {
  printVersion();
  process.exit(0);
}

runAgentMcpServer().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
