import { codexWorker } from "@/lib/codex-worker";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { threadId, text, model, effort } = body;

    if (!threadId || !text) {
      return NextResponse.json({ error: "Missing threadId or text" }, { status: 400 });
    }

    const result = await codexWorker.sendRequest("turn/start", {
      threadId,
      input: [{ type: "text", text }],
      model: model || undefined,
      effort: effort || undefined
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
