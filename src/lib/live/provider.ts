/**
 * Live network status (HLR / carrier lookup).
 * Not configured in v1 — requires paid HLR API or SIGTRAN interconnect.
 */

export type LiveStatus = "active" | "absent" | "invalid" | "unknown" | "not_configured";

export interface LiveLookupResult {
  status: LiveStatus;
  carrier?: string;
  raw?: Record<string, unknown>;
  provider: string;
  configured: boolean;
  message?: string;
}

export interface LiveLookupProvider {
  readonly name: string;
  readonly configured: boolean;
  lookup(e164: string): Promise<LiveLookupResult>;
}

export class NotConfiguredLiveLookupProvider implements LiveLookupProvider {
  readonly name = "none";
  readonly configured = false;

  async lookup(_e164: string): Promise<LiveLookupResult> {
    return {
      status: "not_configured",
      provider: this.name,
      configured: false,
      message:
        "Live network status is not configured. Structural validation and regulator block data are used instead. Plug in an HLR provider (Twilio Lookup, CM.com, CheckMobi) or SIGTRAN interconnect to enable currently-active checks.",
    };
  }
}

let activeProvider: LiveLookupProvider = new NotConfiguredLiveLookupProvider();

export function getLiveLookupProvider(): LiveLookupProvider {
  return activeProvider;
}

export function setLiveLookupProvider(provider: LiveLookupProvider): void {
  activeProvider = provider;
}

export async function lookupLiveStatus(e164: string): Promise<LiveLookupResult> {
  return getLiveLookupProvider().lookup(e164);
}
