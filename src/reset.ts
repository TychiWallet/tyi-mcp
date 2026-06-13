import fs from "node:fs";
import { PATHS } from "@tychilabs/tyi";

export type ResetResult = {
  ok: true;
  removed: string;
  next_steps: string[];
};

/** Wipe local Tychi data (~/.tyi or TYI_DATA_DIR). Requires confirm:true. */
export function resetTyiData(confirm: boolean): ResetResult {
  if (!confirm) {
    throw new Error("tyi_reset requires confirm:true — irreversible delete of local wallet data");
  }
  const dir = PATHS.dir;
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return {
    ok: true,
    removed: dir,
    next_steps: [
      "Remove TYI_PASSWORD from MCP host env (or update after re-onboard).",
      "openclaw mcp unset tychi — if removing integration entirely.",
      "tyi_onboard — fresh setup when ready.",
    ],
  };
}
