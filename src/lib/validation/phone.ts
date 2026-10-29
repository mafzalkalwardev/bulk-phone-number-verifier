import libphonenumber from "google-libphonenumber";

const { PhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } =
  libphonenumber;

const phoneUtil = PhoneNumberUtil.getInstance();

export type LineType =
  | "mobile"
  | "fixed_line"
  | "fixed_line_or_mobile"
  | "toll_free"
  | "premium_rate"
  | "shared_cost"
  | "voip"
  | "personal_number"
  | "pager"
  | "uan"
  | "voicemail"
  | "unknown";

export type Classification =
  | "invalid"
  | "unallocated"
  | "structurally_valid"
  | "unknown";

export interface PhoneFormats {
  e164: string;
  international: string;
  national: string;
}

export interface FormatValidationResult {
  input: string;
  valid: boolean;
  possible: boolean;
  e164: string | null;
  country: string | null;
  lineType: LineType;
  formats: PhoneFormats | null;
  reason?: string;
}

function mapLineType(type: number): LineType {
  switch (type) {
    case PhoneNumberType.MOBILE:
      return "mobile";
    case PhoneNumberType.FIXED_LINE:
      return "fixed_line";
    case PhoneNumberType.FIXED_LINE_OR_MOBILE:
      return "fixed_line_or_mobile";
    case PhoneNumberType.TOLL_FREE:
      return "toll_free";
    case PhoneNumberType.PREMIUM_RATE:
      return "premium_rate";
    case PhoneNumberType.SHARED_COST:
      return "shared_cost";
    case PhoneNumberType.VOIP:
      return "voip";
    case PhoneNumberType.PERSONAL_NUMBER:
      return "personal_number";
    case PhoneNumberType.PAGER:
      return "pager";
    case PhoneNumberType.UAN:
      return "uan";
    case PhoneNumberType.VOICEMAIL:
      return "voicemail";
    default:
      return "unknown";
  }
}

export function normalizeRaw(input: string): string {
  return input.trim().replace(/[\s().\-]/g, "");
}

export function validatePhoneFormat(
  input: string,
  defaultCountry = "US"
): FormatValidationResult {
  const raw = input?.trim() ?? "";
  if (!raw) {
    return {
      input: raw,
      valid: false,
      possible: false,
      e164: null,
      country: null,
      lineType: "unknown",
      formats: null,
      reason: "empty",
    };
  }

  try {
    const region = defaultCountry.toUpperCase();
    const parsed = phoneUtil.parseAndKeepRawInput(raw, region);
    const possible = phoneUtil.isPossibleNumber(parsed);
    const valid = phoneUtil.isValidNumber(parsed);
    const regionCode = phoneUtil.getRegionCodeForNumber(parsed) ?? region;
    const e164 = phoneUtil.format(parsed, PhoneNumberFormat.E164);
    const lineType = mapLineType(phoneUtil.getNumberType(parsed));

    return {
      input: raw,
      valid,
      possible,
      e164: valid || possible ? e164 : null,
      country: regionCode,
      lineType,
      formats:
        valid || possible
          ? {
              e164,
              international: phoneUtil.format(
                parsed,
                PhoneNumberFormat.INTERNATIONAL
              ),
              national: phoneUtil.format(parsed, PhoneNumberFormat.NATIONAL),
            }
          : null,
      reason: valid ? undefined : possible ? "possible_but_invalid" : "invalid",
    };
  } catch {
    return {
      input: raw,
      valid: false,
      possible: false,
      e164: null,
      country: null,
      lineType: "unknown",
      formats: null,
      reason: "parse_error",
    };
  }
}

export function scoreResult(opts: {
  valid: boolean;
  possible: boolean;
  lineType: LineType;
  blockStatus: "allocated" | "free" | "unknown" | null;
}): number {
  if (!opts.valid && !opts.possible) return 0;

  let score = 0;
  if (opts.valid) score += 50;
  else if (opts.possible) score += 20;

  if (opts.lineType === "mobile" || opts.lineType === "fixed_line_or_mobile") {
    score += 20;
  } else if (opts.lineType === "fixed_line") {
    score += 10;
  } else if (opts.lineType === "voip") {
    score += 5;
  }

  if (opts.valid) {
    if (opts.blockStatus === "allocated") score += 25;
    else if (opts.blockStatus === "free") score -= 40;
  }

  return Math.max(0, Math.min(100, score));
}

export function classifyResult(opts: {
  valid: boolean;
  possible: boolean;
  blockStatus: "allocated" | "free" | "unknown" | null;
  hasBlockCoverage: boolean;
}): Classification {
  if (!opts.valid && !opts.possible) return "invalid";
  if (!opts.valid) return "invalid";

  if (opts.blockStatus === "free") return "unallocated";
  if (opts.blockStatus === "allocated") return "structurally_valid";

  // Valid format but no regulator coverage for this country/prefix
  if (!opts.hasBlockCoverage) return "unknown";
  return "structurally_valid";
}

export function isSmsCandidate(lineType: LineType, classification: Classification): boolean {
  if (classification !== "structurally_valid") return false;
  return lineType === "mobile" || lineType === "fixed_line_or_mobile";
}
