import { prisma } from "@/lib/db";

export type BlockStatus = "allocated" | "free" | "unknown";

export interface BlockMatch {
  status: BlockStatus;
  prefix: string | null;
  carrier: string | null;
  source: string | null;
  hasCoverage: boolean;
}

function buildPrefixCandidates(e164: string, country: string): string[] {
  const digits = e164.replace(/\D/g, "");
  const candidates: string[] = [];

  for (let len = Math.min(digits.length, 12); len >= 3; len--) {
    candidates.push(digits.slice(0, len));
  }

  if (country === "US" || country === "CA") {
    const national = digits.startsWith("1") ? digits.slice(1) : digits;
    for (let len = Math.min(national.length, 7); len >= 3; len--) {
      candidates.push(national.slice(0, len));
    }
  }

  if (country === "GB") {
    const national = digits.startsWith("44") ? digits.slice(2) : digits;
    for (let len = Math.min(national.length, 7); len >= 3; len--) {
      candidates.push(national.slice(0, len));
      candidates.push(`0${national.slice(0, len)}`);
    }
  }

  if (country === "DE") {
    const national = digits.startsWith("49") ? digits.slice(2) : digits;
    for (let len = Math.min(national.length, 7); len >= 2; len--) {
      candidates.push(national.slice(0, len));
      candidates.push(`0${national.slice(0, len)}`);
    }
  }

  return [...new Set(candidates)];
}

/**
 * Longest-prefix match against regulator number_blocks.
 */
export async function lookupBlock(
  e164: string | null,
  country: string | null
): Promise<BlockMatch> {
  if (!e164 || !country) {
    return {
      status: "unknown",
      prefix: null,
      carrier: null,
      source: null,
      hasCoverage: false,
    };
  }

  const cc = country.toUpperCase();

  const covered = await prisma.numberBlock.findFirst({
    where: { country: cc },
    select: { id: true },
  });

  if (!covered) {
    return {
      status: "unknown",
      prefix: null,
      carrier: null,
      source: null,
      hasCoverage: false,
    };
  }

  const candidates = buildPrefixCandidates(e164, cc);
  if (candidates.length === 0) {
    return {
      status: "unknown",
      prefix: null,
      carrier: null,
      source: null,
      hasCoverage: true,
    };
  }

  const matches = await prisma.numberBlock.findMany({
    where: {
      country: cc,
      prefix: { in: candidates },
    },
  });

  if (matches.length === 0) {
    return {
      status: "unknown",
      prefix: null,
      carrier: null,
      source: null,
      hasCoverage: true,
    };
  }

  // Prefer longest prefix match
  matches.sort((a, b) => b.prefix.length - a.prefix.length);
  const block = matches[0];

  return {
    status: block.status as BlockStatus,
    prefix: block.prefix,
    carrier: block.carrier,
    source: block.source,
    hasCoverage: true,
  };
}
