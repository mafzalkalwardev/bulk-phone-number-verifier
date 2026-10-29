import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getLiveLookupProvider,
  isBulkLiveLookupEnabled,
  isLiveLookupConfigured,
  lookupLiveStatus,
} from "@/lib/live/provider";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provider = getLiveLookupProvider();
  const configured = isLiveLookupConfigured();

  let authOk: boolean | null = null;
  let authDetail: unknown = null;
  if (configured && typeof provider.authTest === "function") {
    const test = await provider.authTest();
    authOk = test.ok;
    authDetail = test.body;
  }

  return NextResponse.json({
    name: provider.name,
    configured,
    bulkEnabled: isBulkLiveLookupEnabled(),
    status: configured ? (authOk === false ? "auth_failed" : "ready") : "not_configured",
    authOk,
    authDetail,
    signupUrl: "https://www.hlr-lookups.com/en/api-settings",
    docsUrl: "https://www.hlr-lookups.com/en/api-docs",
    message: configured
      ? authOk === false
        ? "HLR keys are set but auth-test failed — check HLR_API_KEY / HLR_API_SECRET."
        : `Live HLR via ${provider.name} is ready. Bulk jobs ${
            isBulkLiveLookupEnabled() ? "WILL" : "will NOT"
          } spend credits (HLR_BULK_ENABLED).`
      : "Set HLR_API_KEY and HLR_API_SECRET in .env from https://www.hlr-lookups.com/en/api-settings",
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isLiveLookupConfigured()) {
    return NextResponse.json(
      {
        error: "HLR not configured",
        hint: "Add HLR_API_KEY and HLR_API_SECRET to .env",
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || body.msisdn || "").trim();
  if (!phone) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }

  const e164 = phone.startsWith("+") ? phone : `+${phone}`;
  const result = await lookupLiveStatus(e164);
  return NextResponse.json({ result });
}
