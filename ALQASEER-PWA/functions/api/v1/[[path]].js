const LOCAL_DEV_UPSTREAM_API_BASE = "http://127.0.0.1:8000/api/v1";
const UPSTREAM_ENV_KEYS = ["DPM_UPSTREAM_API_BASE_URL", "DPM_API_BASE_URL", "API_BASE_URL"];

const FORWARDED_HEADERS = ["accept", "authorization", "content-type"];
const HOP_BY_HOP_HEADERS = [
  "connection",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
];

function normalizePath(pathParam) {
  if (Array.isArray(pathParam)) return pathParam.join("/");
  if (!pathParam) return "";
  return String(pathParam).replace(/^\/+/, "");
}

function normalizeApiBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function isLocalPagesRequest(requestUrl) {
  const { hostname } = new URL(requestUrl);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname.endsWith(".local");
}

function resolveUpstreamApiBase(requestUrl, env = {}) {
  for (const key of UPSTREAM_ENV_KEYS) {
    const value = normalizeApiBase(env[key]);
    if (value) return value;
  }

  if (isLocalPagesRequest(requestUrl)) return LOCAL_DEV_UPSTREAM_API_BASE;

  throw new Error("UPSTREAM_API_BASE_MISSING");
}

function buildUpstreamUrl(requestUrl, pathParam, env) {
  const incoming = new URL(requestUrl);
  const upstreamPath = normalizePath(pathParam);
  const upstream = new URL(`${resolveUpstreamApiBase(requestUrl, env)}/${upstreamPath}`);
  upstream.search = incoming.search;
  return upstream;
}

function buildForwardHeaders(request) {
  const headers = new Headers();
  for (const name of FORWARDED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

function sanitizeResponseHeaders(headers) {
  const nextHeaders = new Headers(headers);
  for (const name of HOP_BY_HOP_HEADERS) {
    nextHeaders.delete(name);
  }
  nextHeaders.set("cache-control", "no-store");
  return nextHeaders;
}

function buildCorsHeaders(request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (!origin || origin !== requestOrigin) return {};

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "authorization, content-type, accept",
    vary: "Origin",
  };
}

function safeJson(payload, init) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init?.headers || {}),
    },
  });
}

export async function onRequest(context) {
  const { request, params, env } = context;
  const corsHeaders = buildCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        allow: "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "cache-control": "no-store",
        ...corsHeaders,
      },
    });
  }

  let upstreamUrl;
  try {
    upstreamUrl = buildUpstreamUrl(request.url, params.path, env);
  } catch (_error) {
    return safeJson(
      {
        error: "UPSTREAM_API_BASE_MISSING",
        message: "Cloudflare Pages API proxy requires DPM_UPSTREAM_API_BASE_URL.",
      },
      { status: 502, headers: corsHeaders },
    );
  }
  const init = {
    method: request.method,
    headers: buildForwardHeaders(request),
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), init);
    const responseHeaders = sanitizeResponseHeaders(upstreamResponse.headers);
    for (const [name, value] of Object.entries(corsHeaders)) {
      responseHeaders.set(name, value);
    }
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (_error) {
    return safeJson(
      {
        error: "UPSTREAM_UNREACHABLE",
        message: "API proxy could not reach the upstream service.",
      },
      { status: 502, headers: corsHeaders },
    );
  }
}
