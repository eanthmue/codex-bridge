import { codexWorker } from "@/lib/codex-worker";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!codexWorker.initialized) {
      await codexWorker.start();
    }

    const modelsResult = await codexWorker.listModels({ includeHidden: true });

    return NextResponse.json({
      models: modelsResult?.data || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
