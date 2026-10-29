import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_BLOCKS: Array<{
  country: string;
  prefix: string;
  status: "allocated" | "free";
  carrier?: string;
  ocn?: string;
  source: string;
}> = [
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
  { country: "US", prefix: "999999", status: "free", source: "seed" },
  { country: "US", prefix: "000000", status: "free", source: "seed" },
  { country: "US", prefix: "2125550", status: "allocated", carrier: "Example Carrier NY", ocn: "9999", source: "seed" },
  { country: "US", prefix: "3105551", status: "allocated", carrier: "Example Carrier CA", ocn: "9998", source: "seed" },
  { country: "GB", prefix: "07700", status: "allocated", carrier: "Example UK Mobile", source: "seed" },
  { country: "GB", prefix: "07400", status: "allocated", carrier: "Example UK Mobile", source: "seed" },
  { country: "GB", prefix: "07911", status: "allocated", carrier: "Example UK Mobile", source: "seed" },
  { country: "GB", prefix: "0203", status: "allocated", carrier: "Example London Geo", source: "seed" },
  { country: "GB", prefix: "0207", status: "allocated", carrier: "Example London Geo", source: "seed" },
  { country: "GB", prefix: "0113", status: "allocated", carrier: "Example Leeds Geo", source: "seed" },
  { country: "GB", prefix: "0161", status: "allocated", carrier: "Example Manchester Geo", source: "seed" },
  { country: "GB", prefix: "0800", status: "allocated", carrier: "Example UK Freephone", source: "seed" },
  { country: "GB", prefix: "07000", status: "free", source: "seed" },
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
  { country: "DE", prefix: "0190", status: "free", source: "seed" },
];

const DE_MOBILE_NDCS = [
  "150", "151", "152", "155", "156", "157", "159",
  "160", "162", "163", "170", "171", "172", "173",
  "174", "175", "176", "177", "178", "179",
];

async function main() {
  const email = "demo@phoneverify.local";
  const password = "demo1234";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Demo User", passwordHash },
    update: { passwordHash, name: "Demo User" },
  });

  let seedCount = 0;
  for (const block of SEED_BLOCKS) {
    await prisma.numberBlock.upsert({
      where: { country_prefix: { country: block.country, prefix: block.prefix } },
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
    seedCount++;
  }

  let deCount = 0;
  for (const prefix of DE_MOBILE_NDCS) {
    await prisma.numberBlock.upsert({
      where: { country_prefix: { country: "DE", prefix } },
      create: {
        country: "DE",
        prefix,
        status: "allocated",
        carrier: "DE mobile NDC (plan)",
        source: "bnetza",
        syncedAt: new Date(),
      },
      update: {
        status: "allocated",
        source: "bnetza",
        syncedAt: new Date(),
      },
    });
    deCount++;
  }

  console.log("Seed complete");
  console.log(`  User: ${user.email} / ${password}`);
  console.log(`  Seed blocks: ${seedCount}`);
  console.log(`  BNetzA NDC prefixes: ${deCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
