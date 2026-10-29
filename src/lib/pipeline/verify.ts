import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { lookupBlock } from "@/lib/blocks/lookup";
import {
  isBulkLiveLookupEnabled,
  isLiveLookupConfigured,
  lookupLiveStatus,
} from "@/lib/live/provider";
import {
  classifyResult,
  scoreResult,
  validatePhoneFormat,
  type Classification,
  type LineType,
} from "@/lib/validation/phone";

export interface VerifyResult {
  input: string;
  e164: string | null;
  country: string | null;
  lineType: LineType;
  classification: Classification;
  blockStatus: string | null;
  blockPrefix: string | null;
  blockCarrier: string | null;
  blockSource: string | null;
  score: number;
  formats: { e164: string; international: string; national: string } | null;
  liveStatus: string;
  liveConfigured: boolean;
  liveCarrier?: string | null;
  liveConnectivity?: string | null;
  livePorted?: boolean | null;
  liveRoaming?: boolean | null;
  liveDataSource?: string | null;
  liveMessage?: string;
  cached: boolean;
}

function hashResult(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function applyLiveToScore(
  score: number,
  liveStatus: string,
  liveConfigured: boolean
): number {
  if (!liveConfigured || liveStatus === "not_configured") return score;
  if (liveStatus === "active") return Math.min(100, score + 15);
  if (liveStatus === "absent") return Math.max(0, score - 5);
  if (liveStatus === "invalid") return Math.max(0, Math.min(score, 25));
  return score;
}

function applyLiveToClassification(
  classification: Classification,
  liveStatus: string,
  liveConfigured: boolean
): Classification {
  if (!liveConfigured) return classification;
  // Authoritative network "dead" overrides structural validity
  if (liveStatus === "invalid" && classification !== "invalid") {
    return "invalid";
  }
  return classification;
}

export async function verifyNumber(
  input: string,
  defaultCountry = "US",
  opts?: { useCache?: boolean; includeLive?: boolean; bulk?: boolean }
): Promise<VerifyResult> {
  const useCache = opts?.useCache !== false;
  const bulk = opts?.bulk === true;

  let includeLive = opts?.includeLive;
  if (includeLive === undefined) {
    includeLive = bulk ? isBulkLiveLookupEnabled() : isLiveLookupConfigured();
  }

  const format = validatePhoneFormat(input, defaultCountry);

  if (useCache && format.e164) {
    const cached = await prisma.lookupCache.findUnique({
      where: { e164: format.e164 },
    });
    if (cached && cached.expiresAt > new Date()) {
      const parsed = JSON.parse(cached.resultJson) as VerifyResult;
      // If cache was from before HLR was configured, refresh live when now enabled
      if (
        includeLive &&
        isLiveLookupConfigured() &&
        (!parsed.liveConfigured || parsed.liveStatus === "not_configured")
      ) {
        // fall through to re-verify
      } else {
        return { ...parsed, cached: true };
      }
    }
  }

  const block = await lookupBlock(format.e164, format.country);

  let classification = classifyResult({
    valid: format.valid,
    possible: format.possible,
    blockStatus: block.status === "unknown" ? "unknown" : block.status,
    hasBlockCoverage: block.hasCoverage,
  });

  let score = scoreResult({
    valid: format.valid,
    possible: format.possible,
    lineType: format.lineType,
    blockStatus: block.status,
  });

  let liveStatus = "not_configured";
  let liveConfigured = false;
  let liveCarrier: string | null = null;
  let liveConnectivity: string | null = null;
  let livePorted: boolean | null = null;
  let liveRoaming: boolean | null = null;
  let liveDataSource: string | null = null;
  let liveMessage: string | undefined;

  if (includeLive && format.e164 && format.valid) {
    const live = await lookupLiveStatus(format.e164);
    liveStatus = live.status;
    liveConfigured = live.configured;
    liveCarrier = live.carrier ?? null;
    liveConnectivity = live.connectivity ?? null;
    livePorted = live.ported ?? null;
    liveRoaming = live.roaming ?? null;
    liveDataSource = live.dataSource ?? null;
    liveMessage = live.message;
    classification = applyLiveToClassification(
      classification,
      live.status,
      live.configured
    );
    score = applyLiveToScore(score, live.status, live.configured);
  } else if (includeLive && format.e164 && !format.valid) {
    liveConfigured = isLiveLookupConfigured();
    liveStatus = liveConfigured ? "skipped_invalid_format" : "not_configured";
    liveMessage = liveConfigured
      ? "Skipped live HLR (number failed format validation)."
      : undefined;
  }

  const result: VerifyResult = {
    input,
    e164: format.e164,
    country: format.country,
    lineType: format.lineType,
    classification,
    blockStatus: block.status,
    blockPrefix: block.prefix,
    blockCarrier: block.carrier,
    blockSource: block.source,
    score,
    formats: format.formats,
    liveStatus,
    liveConfigured,
    liveCarrier,
    liveConnectivity,
    livePorted,
    liveRoaming,
    liveDataSource,
    liveMessage,
    cached: false,
  };

  if (useCache && format.e164 && format.valid) {
    const ttlDays = Number(process.env.LOOKUP_CACHE_TTL_DAYS || "30");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ttlDays);
    const resultHash = hashResult(result);

    await prisma.lookupCache.upsert({
      where: { e164: format.e164 },
      create: {
        e164: format.e164,
        resultHash,
        resultJson: JSON.stringify(result),
        expiresAt,
      },
      update: {
        resultHash,
        resultJson: JSON.stringify(result),
        expiresAt,
      },
    });
  }

  return result;
}
