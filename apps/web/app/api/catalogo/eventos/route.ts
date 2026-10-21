const DEFAULT_API_BASE = "http://localhost:3003";
const HEARTBEAT_MS = 25_000;

/**
 * Bridges the API catalog events to the browser. Every change expires the
 * `catalog` cache tag and is forwarded, so clients re-render fresh data.
 *
 * shortcut: one upstream connection per open browser tab — fine for the
 * catalog's traffic; switch to a shared subscriber if the audience grows.
 */
export async function GET(request: Request) {
  const base = (process.env.API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/$/, "");
  const upstream = new AbortController();
  const abort = () => upstream.abort();
  request.signal.addEventListener("abort", abort);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          closed = true;
        }
      };
      const heartbeat = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);

      try {
        const res = await fetch(`${base}/catalogo/eventos`, {
          headers: { Accept: "text/event-stream" },
          signal: upstream.signal,
          cache: "no-store",
        });
        if (!res.ok || !res.body) throw new Error(`API ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let end: number;
          while ((end = buffer.indexOf("\n\n")) !== -1) {
            const event = buffer.slice(0, end + 2);
            buffer = buffer.slice(end + 2);
            if (event.includes("event: catalogo")) {
              // The cache is expired by a separate request: pending
              // revalidations are applied when a response finishes, and this
              // one streams forever.
              await fetch(new URL("/api/catalogo/revalidar", request.url), {
                method: "POST",
              }).catch(() => {});
              send('event: catalogo\ndata: {"ok":true}\n\n');
            }
          }
        }
      } catch {
        // The API is down or the client left: end the stream. EventSource
        // reconnects on its own.
      } finally {
        clearInterval(heartbeat);
        request.signal.removeEventListener("abort", abort);
        if (!closed) controller.close();
      }
    },
    cancel() {
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
