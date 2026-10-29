import { NextResponse } from "next/server";
import Papa from "papaparse";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { enqueueVerificationJob } from "@/lib/jobs/queue";

const metaSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  defaultCountry: z.string().length(2).optional(),
  phoneColumn: z.string().optional(),
});

function extractNumbersFromText(text: string, phoneColumn?: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Try CSV parse
  const parsed = Papa.parse<Record<string, string>>(trimmed, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.data.length > 0 && parsed.meta.fields && parsed.meta.fields.length > 0) {
    const fields = parsed.meta.fields;
    const col =
      phoneColumn && fields.includes(phoneColumn)
        ? phoneColumn
        : fields.find((f) => /phone|mobile|msisdn|number|tel/i.test(f)) || fields[0];

    return parsed.data
      .map((row) => (row[col] || "").toString().trim())
      .filter(Boolean);
  }

  // Plain list: one number per line
  return trimmed
    .split(/\r?\n/)
    .map((l) => l.split(/[,;\t]/)[0].trim())
    .filter((l) => l && !/^phone$/i.test(l));
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    let name = "Untitled job";
    let defaultCountry = "US";
    let phoneColumn: string | undefined;
    let fileText = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      name = String(form.get("name") || name);
      defaultCountry = String(form.get("defaultCountry") || "US").toUpperCase();
      phoneColumn = form.get("phoneColumn")
        ? String(form.get("phoneColumn"))
        : undefined;
      const file = form.get("file");
      if (file && typeof file !== "string") {
        fileText = await file.text();
      } else if (form.get("text")) {
        fileText = String(form.get("text"));
      }
    } else {
      const body = await req.json();
      const meta = metaSchema.safeParse(body);
      if (meta.success) {
        name = meta.data.name || name;
        defaultCountry = (meta.data.defaultCountry || "US").toUpperCase();
        phoneColumn = meta.data.phoneColumn;
      }
      fileText = String(body.text || body.content || "");
    }

    const numbers = extractNumbersFromText(fileText, phoneColumn);
    if (numbers.length === 0) {
      return NextResponse.json(
        { error: "No phone numbers found in upload" },
        { status: 400 }
      );
    }

    if (numbers.length > 100_000) {
      return NextResponse.json(
        { error: "Maximum 100,000 numbers per job" },
        { status: 400 }
      );
    }

    const job = await prisma.job.create({
      data: {
        userId: session.user.id,
        name,
        defaultCountry,
        status: "pending",
        totalRows: numbers.length,
        rows: {
          create: numbers.map((input) => ({
            input,
            classification: "pending",
          })),
        },
      },
    });

    await enqueueVerificationJob(job.id);

    return NextResponse.json({ job: { id: job.id, totalRows: job.totalRows } }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
