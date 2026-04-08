import { codexWorker } from "@/lib/codex-worker";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!codexWorker.initialized) {
      await codexWorker.start();
    }
    
    const result = await codexWorker.readThread(id);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Error reading thread:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
