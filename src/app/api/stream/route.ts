import { codexWorker } from "@/lib/codex-worker";
import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    if (!codexWorker.initialized) {
      await codexWorker.start();
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }

  const stream = new ReadableStream({
    start(controller) {
      const enqueueMessage = (msg: any) => {
        try {
          const data = `data: ${JSON.stringify(msg)}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));
        } catch (err) {
          console.error("Failed to enqueue message:", err);
        }
      };

      codexWorker.on("notification", enqueueMessage);
      codexWorker.on("serverRequest", enqueueMessage);

      req.signal.addEventListener("abort", () => {
        codexWorker.off("notification", enqueueMessage);
        codexWorker.off("serverRequest", enqueueMessage);
        try { controller.close(); } catch (e) {
          console.error("Error closing stream controller:", e);
        }
      });
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
