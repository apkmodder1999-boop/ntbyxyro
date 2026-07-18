import { createFileRoute } from "@tanstack/react-router";

const BEARER_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxNDczMTEyLCJhcHBfaWQiOiIxNzcwOTgxMzQ3IiwiZGV2aWNlX2lkIjoiYzZmZTNjYWYtOWRkMS00ZTE0LTgyMGEtNGIyZDVjMjJjNDViIiwicGxhdGZvcm0iOiIzIiwidXNlcl90eXBlIjoxLCJpYXQiOjE3ODI5MjAwNDgsImV4cCI6MTc4NTUxMjA0OH0.pTxsgyTr40qj5ilkT2AuIIok9IGT7jgHO8bRtc7fhCI";

type Target = { host: string; strip: string };
const TARGETS: Record<string, Target> = {
  "/penpencil/": { host: "api.penpencil.co", strip: "/penpencil" },
  "/rcxapi": { host: "rcxapi.vercel.app", strip: "" },
  "/home/": { host: "home.nexttoppers.com", strip: "" },
  "/course/": { host: "course.nexttoppers.com", strip: "" },
  "/auth/": { host: "auth.nexttoppers.com", strip: "" },
  "/payment/": { host: "payment.nexttoppers.com", strip: "" },
  "/credentials/": { host: "learnbyakp.online", strip: "/credentials" },
  "/wasmer/": { host: "eduvibe-nt-api.wasmer.app", strip: "/wasmer" },
  "/eduvibe/": { host: "course.nexttoppers.com", strip: "/eduvibe" },
  "/akp/": { host: "learnbyakp.onrender.com", strip: "/akp" },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

async function handle(request: Request) {
  const url = new URL(request.url);
  const endpoint = url.searchParams.get("endpoint") || "";
  let pathname = endpoint.startsWith("/") ? endpoint : "/" + endpoint;

  let target: Target | null = null;
  for (const [prefix, t] of Object.entries(TARGETS)) {
    if (pathname.startsWith(prefix)) {
      target = t;
      if (t.strip) pathname = pathname.replace(t.strip, "");
      break;
    }
  }
  if (!target) {
    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const h = request.headers;
  const token = h.get("authorization") || `Bearer ${BEARER_TOKEN}`;

  const headers: Record<string, string> = {
    accept: h.get("accept") || "application/json",
    "content-type": h.get("content-type") || "application/json",
    "accept-language": h.get("accept-language") || "",
    authorization: token,
    app_id: h.get("app_id") || "1770981347",
    platform: h.get("platform") || "3",
    user_id: h.get("user_id") || "0",
    version: h.get("version") || "1",
    origin: "https://nexttoppers.com",
    referer: "https://nexttoppers.com/",
  };

  if (target.host === "api.penpencil.co") {
    Object.assign(headers, {
      "client-id": "5eb393ee95fab7468a79d189",
      "client-version": "343",
      "client-type": "WEB",
      randomid: "vidyaverse-" + Date.now(),
    });
  }
  if (target.host === "learnbyakp.online") {
    headers["authorization"] = "";
    headers["origin"] = "https://learnbyakp.online";
    headers["referer"] = "https://learnbyakp.online/";
  }
  if (target.host === "eduvibe-nt-api.wasmer.app") {
    headers["origin"] = "https://eduvibe-nt.pages.dev";
    headers["referer"] = "https://eduvibe-nt.pages.dev/";
  }

  try {
    const upstream = await fetch(`https://${target.host}${pathname}`, {
      method: request.method,
      headers,
      body,
    });
    const data = await upstream.arrayBuffer();
    const outHeaders = new Headers();
    upstream.headers.forEach((v, k) => {
      const lk = k.toLowerCase();
      if (
        lk.startsWith("access-control-") ||
        lk === "transfer-encoding" ||
        lk === "connection" ||
        lk === "content-encoding" ||
        lk === "content-length"
      )
        return;
      outHeaders.set(k, v);
    });
    Object.entries(CORS).forEach(([k, v]) => outHeaders.set(k, v));
    return new Response(data, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch (e) {
    return new Response("Proxy Error", { status: 500, headers: CORS });
  }
}

export const Route = createFileRoute("/api/proxy")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
