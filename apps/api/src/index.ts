import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers";
import { buildContext } from "./auth";

const PORT = parseInt(process.env.PORT ?? "3001");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Bun.serve({
  port: PORT,
  fetch(req) {
    const { pathname } = new URL(req.url);

    if (pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    return fetchRequestHandler({
      endpoint: "/trpc",
      req,
      router: appRouter,
      createContext: ({ req }) => buildContext(req),
    }).then((res) => {
      const headers = new Headers(res.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
      return new Response(res.body, { status: res.status, headers });
    });
  },
});

console.log(`API server running on port ${PORT}`);
