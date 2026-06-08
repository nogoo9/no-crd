import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const port = process.env.PORT || "3000";

console.log(`Starting Auth Demo server on port ${port}...`);

function decodeJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { error: "Invalid JWT structure" };
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(jsonPayload);
  } catch (err) {
    return { error: `Failed to decode JWT: ${err instanceof Error ? err.message : String(err)}` };
  }
}

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

    // Expose dummy token API (decodes access token and returns it)
    if (url.pathname.endsWith("/api/dummy-token")) {
      let token = req.headers.get("x-workspace-jwt") || "";
      if (!token) {
        const authHeader = req.headers.get("authorization") || "";
        if (authHeader.toLowerCase().startsWith("bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return new Response(JSON.stringify({ error: "Access token not found in headers" }), {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      const decoded = decodeJwt(token);
      return new Response(JSON.stringify({ token, decoded }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
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
