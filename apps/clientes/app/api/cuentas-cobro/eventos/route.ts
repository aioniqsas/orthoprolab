import { cookies } from "next/headers";
import { API_URL } from "@/lib/api";

const HEARTBEAT_MS = 25_000;

/**
 * Bridges the API billing-account events to the browser, forwarding the session
 * cookie so the API guard accepts the upstream stream.
 *
 * shortcut: one upstream connection per open browser tab — fine for a lab's
 * traffic; switch to a shared subscriber if the audience grows.
 */
export async function GET(request: Request) {
  const token = (await cookies()).get("auth_token")?.value;
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
        const res = await fetch(`${API_URL}/mi-clinica/cuentas-cobro/eventos`, {
          headers: {
            Accept: "text/event-stream",
            ...(token ? { Cookie: `auth_token=${token}` } : {}),
          },
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
            const evento = buffer.slice(0, end + 2);
            buffer = buffer.slice(end + 2);
            if (evento.includes("event: cuenta-cobro")) {
              send('event: cuenta-cobro\ndata: {"ok":true}\n\n');
            }
          }
        }
      } catch {
        // API caída o pestaña cerrada: se cierra el stream; EventSource reintenta.
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
