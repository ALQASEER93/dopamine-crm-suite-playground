const UPSTREAM_API_BASE = "https://dopamine-crm-api.vercel.app/api/v1";

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

function buildUpstreamUrl(requestUrl, pathParam) {
  const incoming = new URL(requestUrl);
  const upstreamPath = normalizePath(pathParam);
  const upstream = new URL(`${UPSTREAM_API_BASE}/${upstreamPath}`);
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
  const { request, params } = context;
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

  const upstreamUrl = buildUpstreamUrl(request.url, params.path);
  const init = {
    method: request.method,
    headers: buildForwardHeaders(request),
    redirect: "manual",
  };

  if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
    init.body = request.body;
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
