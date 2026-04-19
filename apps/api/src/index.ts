import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./routers";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

Bun.serve({
  port: 3001,
  fetch(req) {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    return fetchRequestHandler({
      endpoint: "/trpc",
      req,
      router: appRouter,
      createContext: () => ({}),
    }).then((res) => {
      const headers = new Headers(res.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => headers.set(k, v));
      return new Response(res.body, { status: res.status, headers });
    });
  },
});

console.log("API server running on http://localhost:3001");
