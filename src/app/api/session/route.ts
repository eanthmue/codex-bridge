import { codexWorker } from "@/lib/codex-worker";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    if (!codexWorker.initialized) {
      await codexWorker.start();
    }

    // Fetch models and threads
    const [modelsResult] = await Promise.all([
      codexWorker.listModels({ includeHidden: true }),
      codexWorker.listThreads({
        cwd: process.cwd(),
      })
    ]);

    return NextResponse.json({
      threads: codexWorker.threads,
      models: modelsResult?.data || []
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { model } = await req.json().catch(() => ({ model: "gpt-5.4" }));

    if (!codexWorker.initialized) {
      await codexWorker.start();
    }

    const result = await codexWorker.sendRequest("thread/start", {
      model: model || "gpt-5.4",
      serviceName: "codex_bridge_web",
      cwd: process.cwd(),
    });

    if (result?.thread?.id) {
      codexWorker.lastThreadId = result.thread.id;
      if (!codexWorker.threads.some((t: any) => t.thread.id === result.thread.id)) {
        codexWorker.threads.unshift(result);
      }
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Session creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
