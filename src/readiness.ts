import {
  agentConfigExists,
  getKeystore,
  keystoreExists,
  PATHS,
  getEvmAddress,
  getSolAddress,
  getSuiAddress,
  getWalletName,
  loadWallet,
  setCurrentPassword,
} from "@tychilabs/tyi";
import { getBrainUrl } from "@tychilabs/tyi";
import { brainHasLlmKey } from "./brain-llm.js";
import type { OnboardMode, ReadinessSnapshot } from "./types.js";

function passwordFromEnv(): string | undefined {
  const pw = process.env.TYI_PASSWORD ?? process.env.KEYSTORE_PASSWORD;
  return pw?.trim() || undefined;
}

export async function getReadiness(): Promise<ReadinessSnapshot> {
  const missing: string[] = [];
  const hints: string[] = [];

  const hasKeystore = keystoreExists();
  if (!hasKeystore) missing.push("keystore");
  if (!agentConfigExists()) missing.push("agent_config");

  const ks = getKeystore();
  if (hasKeystore && !ks?.tyiIdentity) missing.push("tyi_identity");

  const pw = passwordFromEnv();
  if (hasKeystore && !pw) {
    missing.push("unlock_password_env");
    hints.push("Set TYI_PASSWORD in MCP host env after onboarding.");
  }

  let llmReady = false;
  if (hasKeystore && pw && ks?.tyiIdentity) {
    try {
      await loadWallet(pw);
      setCurrentPassword(pw);
      llmReady = await brainHasLlmKey(pw);
    } catch {
      missing.push("unlock_failed");
      hints.push("TYI_PASSWORD may be wrong for existing keystore.");
    }
  } else if (hasKeystore && ks?.tyiIdentity) {
    missing.push("llm_key");
  }

  if (!llmReady && hasKeystore && pw && ks?.tyiIdentity && !missing.includes("unlock_failed")) {
    missing.push("llm_key");
    hints.push("Call tyi_onboard with llm_provider + llm_api_key (mode llm_only).");
  }

  let mode: OnboardMode | "ready" = "ready";
  if (missing.includes("keystore") || missing.includes("agent_config") || missing.includes("tyi_identity")) {
    mode = "fresh";
  } else if (missing.includes("llm_key")) {
    mode = "llm_only";
  }

  const snapshot: ReadinessSnapshot = {
    ready: missing.length === 0,
    missing,
    mode,
    data_dir: PATHS.dir,
    brain_url: getBrainUrl(),
    hints,
  };

  if (keystoreExists() && pw && !missing.includes("unlock_failed")) {
    try {
      snapshot.wallet = {
        name: getWalletName(),
        evm_address: getEvmAddress(),
        sol_address: getSolAddress(),
        sui_address: getSuiAddress(),
      };
    } catch {
      /* wallet not loaded */
    }
  }

  return snapshot;
}
