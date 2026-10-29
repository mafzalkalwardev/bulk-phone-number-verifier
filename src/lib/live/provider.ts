/**
 * Live network status (HLR / carrier lookup).
 * Best available: www.hlr-lookups.com when HLR_API_KEY + HLR_API_SECRET are set.
 */

import { createHlrLookupsProviderFromEnv } from "@/lib/live/hlr-lookups";
import type {
  LiveLookupProvider,
  LiveLookupResult,
} from "@/lib/live/types";

export type { LiveLookupProvider, LiveLookupResult, LiveStatus } from "@/lib/live/types";

export class NotConfiguredLiveLookupProvider implements LiveLookupProvider {
  readonly name = "none";
  readonly configured = false;

  async lookup(_e164: string): Promise<LiveLookupResult> {
    return {
      status: "not_configured",
      provider: this.name,
      configured: false,
      message:
        "Live HLR is not configured. Set HLR_API_KEY and HLR_API_SECRET from https://www.hlr-lookups.com/en/api-settings — until then only structural + regulator block checks run.",
    };
  }
}

let overrideProvider: LiveLookupProvider | null = null;

export function setLiveLookupProvider(provider: LiveLookupProvider): void {
  overrideProvider = provider;
}

export function getLiveLookupProvider(): LiveLookupProvider {
  if (overrideProvider) return overrideProvider;

  const fromEnv = createHlrLookupsProviderFromEnv();
  if (fromEnv) return fromEnv;

  return new NotConfiguredLiveLookupProvider();
}

export function isLiveLookupConfigured(): boolean {
  return getLiveLookupProvider().configured;
}

/** Bulk jobs spend 1 credit per number when true (default once keys are set). */
export function isBulkLiveLookupEnabled(): boolean {
  if (!isLiveLookupConfigured()) return false;
  const flag = process.env.HLR_BULK_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0" || flag === "off") return false;
  return true;
}

export async function lookupLiveStatus(e164: string): Promise<LiveLookupResult> {
  return getLiveLookupProvider().lookup(e164);
}
