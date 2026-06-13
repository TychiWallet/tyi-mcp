import { config as loadEnv } from "dotenv";
import path from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ensureDirs, PATHS } from "@tychilabs/tyi";
import { createAgentMcpServer } from "./server.js";

export async function runAgentMcpServer(): Promise<void> {
  ensureDirs();
  loadEnv({ path: PATHS.env, quiet: true });
  loadEnv({ path: path.resolve(process.cwd(), ".env.agent"), quiet: true, override: false });

  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(0);
  });
  process.stderr.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(0);
  });

  const server = createAgentMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write("tyi-mcp agent server running (stdio)\n");
}
