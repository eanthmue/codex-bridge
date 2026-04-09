import { codexWorker } from "@/lib/codex-worker";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!codexWorker.initialized) {
      await codexWorker.start();
    }

    await codexWorker.listThreads({
      cwd: process.cwd(),
    });

    return NextResponse.json({
      threads: codexWorker.threads
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
