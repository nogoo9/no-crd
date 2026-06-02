import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT || "3000";

console.log(`Starting Auth Demo server on port ${port}...`);

Bun.serve({
  port: parseInt(port),
  fetch(req) {
    const url = new URL(req.url);
    console.log(`[Demo App] Received request: ${req.method} ${url.pathname}`);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }

    // Expose headers API
    if (url.pathname.endsWith("/api/headers")) {
      const headersObj: Record<string, string> = {};
      req.headers.forEach((val, key) => {
        headersObj[key] = val;
      });

      return new Response(JSON.stringify({ headers: headersObj }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Serve index.html
    const htmlPath = join(__dirname, "index.html");
    if (existsSync(htmlPath)) {
      const html = readFileSync(htmlPath, "utf-8");
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    return new Response("Auth Demo App. index.html not found.", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  },
});
