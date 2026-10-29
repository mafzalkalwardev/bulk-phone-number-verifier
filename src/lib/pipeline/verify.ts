import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { lookupBlock } from "@/lib/blocks/lookup";
import { lookupLiveStatus } from "@/lib/live/provider";
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
  liveMessage?: string;
  cached: boolean;
}

function hashResult(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function verifyNumber(
  input: string,
  defaultCountry = "US",
  opts?: { useCache?: boolean; includeLive?: boolean }
): Promise<VerifyResult> {
  const useCache = opts?.useCache !== false;
  const includeLive = opts?.includeLive !== false;

  const format = validatePhoneFormat(input, defaultCountry);

  if (useCache && format.e164) {
    const cached = await prisma.lookupCache.findUnique({
      where: { e164: format.e164 },
    });
    if (cached && cached.expiresAt > new Date()) {
      const parsed = JSON.parse(cached.resultJson) as VerifyResult;
      return { ...parsed, cached: true };
    }
  }

  const block = await lookupBlock(format.e164, format.country);

  const classification = classifyResult({
    valid: format.valid,
    possible: format.possible,
    blockStatus: block.status === "unknown" ? "unknown" : block.status,
    hasBlockCoverage: block.hasCoverage,
  });

  const score = scoreResult({
    valid: format.valid,
    possible: format.possible,
    lineType: format.lineType,
    blockStatus: block.status,
  });

  let liveStatus = "not_configured";
  let liveConfigured = false;
  let liveMessage: string | undefined;

  if (includeLive && format.e164) {
    const live = await lookupLiveStatus(format.e164);
    liveStatus = live.status;
    liveConfigured = live.configured;
    liveMessage = live.message;
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
