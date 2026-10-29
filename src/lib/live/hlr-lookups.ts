import { createHmac } from "crypto";
import type {
  LiveLookupProvider,
  LiveLookupResult,
  LiveStatus,
} from "@/lib/live/types";

const API_BASE = "https://www.hlr-lookups.com/api/v2";

/**
 * Official HLR Lookups API (www.hlr-lookups.com).
 * Docs: https://www.hlr-lookups.com/en/api-docs
 * Get keys: https://www.hlr-lookups.com/en/api-settings
 *
 * connectivity_status: CONNECTED | ABSENT | INVALID_MSISDN | UNDETERMINED
 */
export class HlrLookupsComProvider implements LiveLookupProvider {
  readonly name = "hlr-lookups.com";
  readonly configured = true;

  constructor(
    private readonly key: string,
    private readonly secret: string
  ) {}

  async lookup(e164: string): Promise<LiveLookupResult> {
    const msisdn = e164.startsWith("+") ? e164 : `+${e164}`;

    try {
      const data = await this.request("POST", "/hlr-lookup", { msisdn });
      const connectivity = String(data.connectivity_status || "UNDETERMINED")
        .trim()
        .toUpperCase();

      const status = mapConnectivity(connectivity);
      const carrier =
        (data.is_ported && data.ported_network_name
          ? String(data.ported_network_name)
          : data.original_network_name
            ? String(data.original_network_name)
            : undefined) || undefined;

      return {
        status,
        carrier,
        provider: this.name,
        configured: true,
        connectivity,
        ported: Boolean(data.is_ported),
        roaming: Boolean(data.is_roaming),
        countryCode:
          (data.ported_country_code as string) ||
          (data.original_country_code as string) ||
          undefined,
        dataSource: data.data_source ? String(data.data_source) : undefined,
        cost: data.cost != null ? String(data.cost) : undefined,
        raw: data as Record<string, unknown>,
        message: statusMessage(status, connectivity),
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "HLR lookup failed";
      return {
        status: "unknown",
        provider: this.name,
        configured: true,
        message,
      };
    }
  }

  async authTest(): Promise<{ ok: boolean; status: number; body?: unknown }> {
    try {
      const body = await this.request("GET", "/auth-test");
      return { ok: true, status: 200, body };
    } catch (err) {
      const message = err instanceof Error ? err.message : "auth failed";
      const statusMatch = message.match(/HTTP (\d+)/);
      return {
        ok: false,
        status: statusMatch ? Number(statusMatch[1]) : 0,
        body: { error: message },
      };
    }
  }

  private async request(
    method: "GET" | "POST",
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = method === "GET" ? "" : JSON.stringify(body ?? {});
    const signature = createHmac("sha256", this.secret)
      .update(endpoint + timestamp + method + payload)
      .digest("hex");

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "phone-verify/1.0 (hlr-lookups)",
        "X-Digest-Key": this.key,
        "X-Digest-Signature": signature,
        "X-Digest-Timestamp": timestamp,
      },
      body: method === "GET" ? undefined : payload,
    });

    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      throw new Error(
        `HTTP ${res.status}: ${typeof data.error === "string" ? data.error : text.slice(0, 200)}`
      );
    }

    return data;
  }
}

function mapConnectivity(connectivity: string): LiveStatus {
  switch (connectivity) {
    case "CONNECTED":
    case "LIVE":
      return "active";
    case "ABSENT":
    case "ABSENT_SUBSCRIBER":
      return "absent";
    case "INVALID_MSISDN":
    case "DEAD":
    case "INVALID":
      return "invalid";
    default:
      return "unknown";
  }
}

function statusMessage(status: LiveStatus, connectivity: string): string {
  switch (status) {
    case "active":
      return `Live HLR: ${connectivity} — handset reachable on the network.`;
    case "absent":
      return `Live HLR: ${connectivity} — number exists but handset off/out of coverage.`;
    case "invalid":
      return `Live HLR: ${connectivity} — not assigned / will not receive SMS.`;
    default:
      return `Live HLR: ${connectivity || "UNDETERMINED"} — inconclusive.`;
  }
}

export function createHlrLookupsProviderFromEnv(): HlrLookupsComProvider | null {
  const key = process.env.HLR_API_KEY?.trim();
  const secret = process.env.HLR_API_SECRET?.trim();
  if (!key || !secret) return null;
  return new HlrLookupsComProvider(key, secret);
}
