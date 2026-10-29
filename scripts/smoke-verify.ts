import { config } from "dotenv";
config();

async function main() {
  const { verifyNumber } = await import("../src/lib/pipeline/verify");
  const samples: Array<[string, string]> = [
    ["+12125550100", "US"],
    ["+447700900123", "GB"],
    ["+4915112345678", "DE"],
    ["999", "US"],
  ];

  for (const [phone, country] of samples) {
    const r = await verifyNumber(phone, country, { useCache: false });
    console.log(
      phone,
      "=>",
      r.classification,
      r.lineType,
      r.blockStatus,
      "score=" + r.score,
      "live=" + r.liveStatus
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
