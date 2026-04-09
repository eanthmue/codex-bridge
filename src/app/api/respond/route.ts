import { codexWorker } from "@/lib/codex-worker";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, result } = body;

    if (id === undefined || result === undefined) {
      return NextResponse.json({ error: "Missing id or result" }, { status: 400 });
    }

    codexWorker.sendResponse(id, result);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
