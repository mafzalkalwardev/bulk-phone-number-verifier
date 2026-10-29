import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLiveLookupProvider } from "@/lib/live/provider";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getLiveLookupProvider();
  return NextResponse.json({
    name: provider.name,
    configured: provider.configured,
    status: provider.configured ? "ready" : "not_configured",
    message: provider.configured
      ? "Live network lookups are enabled."
      : "Live network status is not configured. Structural validation and regulator block assignment are used instead. Configure an HLR provider later (Twilio Lookup, CM.com, CheckMobi, or SIGTRAN + jSS7).",
  });
}
