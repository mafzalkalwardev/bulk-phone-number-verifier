import { prisma } from "@/lib/db";

/**
 * Representative regulator-style seed blocks for US / UK / DE.
 * Real sync jobs replace/expand these from NANPA, Ofcom, and BNetzA feeds.
 */
const SEED_BLOCKS: Array<{
  country: string;
  prefix: string;
  status: "allocated" | "free";
  carrier?: string;
  ocn?: string;
  source: string;
}> = [
  // US NANPA-style NPA-NXX (national 6-digit) — allocated examples
  { country: "US", prefix: "212555", status: "allocated", carrier: "Example Carrier NY", ocn: "9999", source: "seed" },
  { country: "US", prefix: "310555", status: "allocated", carrier: "Example Carrier CA", ocn: "9998", source: "seed" },
  { country: "US", prefix: "415555", status: "allocated", carrier: "Example Carrier SF", ocn: "9997", source: "seed" },
  { country: "US", prefix: "646555", status: "allocated", carrier: "Example Carrier NYC", ocn: "9996", source: "seed" },
  { country: "US", prefix: "718555", status: "allocated", carrier: "Example Carrier BK", ocn: "9995", source: "seed" },
  { country: "US", prefix: "202555", status: "allocated", carrier: "Example Carrier DC", ocn: "9994", source: "seed" },
  { country: "US", prefix: "312555", status: "allocated", carrier: "Example Carrier CHI", ocn: "9993", source: "seed" },
  { country: "US", prefix: "617555", status: "allocated", carrier: "Example Carrier BOS", ocn: "9992", source: "seed" },
  { country: "US", prefix: "206555", status: "allocated", carrier: "Example Carrier SEA", ocn: "9991", source: "seed" },
  { country: "US", prefix: "305555", status: "allocated", carrier: "Example Carrier MIA", ocn: "9990", source: "seed" },
  // Known fictional / free-style blocks for demo unallocated
  { country: "US", prefix: "999999", status: "free", carrier: undefined, source: "seed" },
  { country: "US", prefix: "000000", status: "free", carrier: undefined, source: "seed" },
  // Thousands-block examples (7 digit)
  { country: "US", prefix: "2125550", status: "allocated", carrier: "Example Carrier NY", ocn: "9999", source: "seed" },
  { country: "US", prefix: "3105551", status: "allocated", carrier: "Example Carrier CA", ocn: "9998", source: "seed" },

  // UK Ofcom-style (leading 0 national)
  { country: "GB", prefix: "07700", status: "allocated", carrier: "Example UK Mobile", source: "seed" },
  { country: "GB", prefix: "07400", status: "allocated", carrier: "Example UK Mobile", source: "seed" },
  { country: "GB", prefix: "07911", status: "allocated", carrier: "Example UK Mobile", source: "seed" },
  { country: "GB", prefix: "0203", status: "allocated", carrier: "Example London Geo", source: "seed" },
  { country: "GB", prefix: "0207", status: "allocated", carrier: "Example London Geo", source: "seed" },
  { country: "GB", prefix: "0113", status: "allocated", carrier: "Example Leeds Geo", source: "seed" },
  { country: "GB", prefix: "0161", status: "allocated", carrier: "Example Manchester Geo", source: "seed" },
  { country: "GB", prefix: "0800", status: "allocated", carrier: "Example UK Freephone", source: "seed" },
  { country: "GB", prefix: "07000", status: "free", carrier: undefined, source: "seed" },

  // DE BNetzA-style mobile ranges 15/16/17
  { country: "DE", prefix: "151", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "152", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "160", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "170", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "171", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "175", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "176", status: "allocated", carrier: "Example DE Mobile", source: "seed" },
  { country: "DE", prefix: "30", status: "allocated", carrier: "Example Berlin Geo", source: "seed" },
  { country: "DE", prefix: "40", status: "allocated", carrier: "Example Hamburg Geo", source: "seed" },
  { country: "DE", prefix: "89", status: "allocated", carrier: "Example Munich Geo", source: "seed" },
  { country: "DE", prefix: "800", status: "allocated", carrier: "Example DE Toll-free", source: "seed" },
  { country: "DE", prefix: "0190", status: "free", carrier: undefined, source: "seed" },
];

export async function seedNumberBlocks(): Promise<number> {
  let upserted = 0;
  for (const block of SEED_BLOCKS) {
    await prisma.numberBlock.upsert({
      where: {
        country_prefix: {
          country: block.country,
          prefix: block.prefix,
        },
      },
      create: {
        country: block.country,
        prefix: block.prefix,
        status: block.status,
        carrier: block.carrier ?? null,
        ocn: block.ocn ?? null,
        source: block.source,
        syncedAt: new Date(),
      },
      update: {
        status: block.status,
        carrier: block.carrier ?? null,
        ocn: block.ocn ?? null,
        source: block.source,
        syncedAt: new Date(),
      },
    });
    upserted++;
  }
  return upserted;
}
