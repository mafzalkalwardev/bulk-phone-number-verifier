export type LiveStatus =
  | "active"
  | "absent"
  | "invalid"
  | "unknown"
  | "not_configured";

export interface LiveLookupResult {
  status: LiveStatus;
  carrier?: string;
  connectivity?: string;
  ported?: boolean;
  roaming?: boolean;
  countryCode?: string;
  dataSource?: string;
  cost?: string;
  raw?: Record<string, unknown>;
  provider: string;
  configured: boolean;
  message?: string;
}

export interface LiveLookupProvider {
  readonly name: string;
  readonly configured: boolean;
  lookup(e164: string): Promise<LiveLookupResult>;
  authTest?: () => Promise<{ ok: boolean; status: number; body?: unknown }>;
}
