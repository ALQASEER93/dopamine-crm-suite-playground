#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const DEFAULT_CRM_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

function getEnv(name, fallback = undefined) {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

function truncateString(s, max = 12000) {
  if (typeof s !== 'string') return s;
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n... (truncated, ${s.length} chars total)`;
}

function assertCrmBaseUrlIsAllowed(baseUrl) {
  const allowNonLocalhost = getEnv('DPM_ALLOW_NON_LOCALHOST', '0') === '1';
  let u;
  try {
    u = new URL(baseUrl);
  } catch {
    throw new Error(`Invalid DPM_CRM_BASE_URL: ${baseUrl}`);
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(`DPM_CRM_BASE_URL must be http(s): ${baseUrl}`);
  }

  const host = u.hostname;
  const isLocalhost = host === '127.0.0.1' || host === 'localhost';
  if (!allowNonLocalhost && !isLocalhost) {
    throw new Error(
      `Blocked non-localhost CRM base URL (${host}). Set DPM_ALLOW_NON_LOCALHOST=1 to override.`
    );
  }

  // Keep API base URL stable as per repo guardrails.
  // If you must change it, do it via DPM_CRM_BASE_URL env, not code.
}

function buildCrmUrl(baseUrl, relativePath) {
  // relativePath may start with / or without.
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const rel = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return new URL(rel, base).toString();
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    redirect: 'error',
    ...options,
    headers: {
      'accept': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const parsed = safeJsonParse(text);

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    headers: {
      'content-type': res.headers.get('content-type') || undefined,
    },
    body: parsed.ok ? parsed.value : { _raw: truncateString(text), _parseError: parsed.error },
  };
}

async function openaiChat({ baseUrl, apiKey, model, system, prompt, temperature }) {
  // Use a minimal, stable request shape (Chat Completions) to avoid SDK lock-in.
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const messages = [];
  if (system && system.trim()) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
    }),
  });

  const text = await res.text();
  const parsed = safeJsonParse(text);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: parsed.ok ? parsed.value : { _raw: truncateString(text), _parseError: parsed.error },
    };
  }

  const data = parsed.ok ? parsed.value : null;
  const content = data?.choices?.[0]?.message?.content;

  return {
    ok: true,
    status: res.status,
    model: data?.model,
    content: typeof content === 'string' ? content : truncateString(text),
    raw: data || truncateString(text),
  };
}

const crmBaseUrl = getEnv('DPM_CRM_BASE_URL', DEFAULT_CRM_BASE_URL);
assertCrmBaseUrlIsAllowed(crmBaseUrl);

const mcpMode = getEnv('DPM_MCP_MODE', 'read_only');

const server = new McpServer({
  name: 'dpm-internal-mcp',
  version: '0.1.0',
});

server.tool(
  'dpm_openai_chat',
  {
    system: z.string().optional().describe('Optional system instructions (kept short).'),
    prompt: z.string().describe('User prompt.'),
    model: z.string().optional().describe(`OpenAI model (default: ${DEFAULT_OPENAI_MODEL}).`),
    temperature: z.number().min(0).max(2).optional().describe('Sampling temperature (0-2).'),
  },
  async ({ system, prompt, model, temperature }) => {
    const apiKey = getEnv('DPM_OPENAI_API_KEY', getEnv('OPENAI_API_KEY'));
    if (!apiKey) {
      return {
        content: [
          {
            type: 'text',
            text: 'Missing OPENAI_API_KEY (or DPM_OPENAI_API_KEY).',
          },
        ],
      };
    }

    const baseUrl = getEnv('DPM_OPENAI_BASE_URL', DEFAULT_OPENAI_BASE_URL);
    const useModel = model || getEnv('DPM_OPENAI_MODEL', DEFAULT_OPENAI_MODEL);

    const result = await openaiChat({
      baseUrl,
      apiKey,
      model: useModel,
      system,
      prompt,
      temperature: temperature ?? 0.2,
    });

    if (!result.ok) {
      return {
        content: [
          {
            type: 'text',
            text: truncateString(
              JSON.stringify(
                {
                  error: 'OpenAI request failed',
                  status: result.status,
                  details: result.error,
                },
                null,
                2
              ),
              12000
            ),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: result.content,
        },
      ],
    };
  }
);

server.tool(
  'dpm_backend_openapi',
  {
    // no args
  },
  async () => {
    const url = buildCrmUrl(crmBaseUrl, '/openapi.json');
    const result = await fetchJson(url, { method: 'GET' });

    return {
      content: [
        {
          type: 'text',
          text: truncateString(JSON.stringify(result, null, 2), 12000),
        },
      ],
    };
  }
);

server.tool(
  'dpm_backend_get',
  {
    path: z
      .string()
      .describe('Relative API path under DPM_CRM_BASE_URL, e.g. /visits?limit=10 or visits/123'),
    bearerToken: z
      .string()
      .optional()
      .describe('Optional Authorization Bearer token to forward to the backend.'),
  },
  async ({ path, bearerToken }) => {
    const url = buildCrmUrl(crmBaseUrl, path);

    const headers = {};
    if (bearerToken) headers['authorization'] = `Bearer ${bearerToken}`;

    const result = await fetchJson(url, { method: 'GET', headers });

    return {
      content: [
        {
          type: 'text',
          text: truncateString(JSON.stringify(result, null, 2), 12000),
        },
      ],
    };
  }
);

server.tool(
  'dpm_backend_post',
  {
    path: z.string().describe('Relative API path under DPM_CRM_BASE_URL.'),
    jsonBody: z.unknown().describe('JSON body to POST.'),
    bearerToken: z
      .string()
      .optional()
      .describe('Optional Authorization Bearer token to forward to the backend.'),
  },
  async ({ path, jsonBody, bearerToken }) => {
    if (mcpMode !== 'read_write') {
      return {
        content: [
          {
            type: 'text',
            text: 'Blocked: dpm_backend_post is disabled in read_only mode. Set DPM_MCP_MODE=read_write to enable.',
          },
        ],
      };
    }

    const url = buildCrmUrl(crmBaseUrl, path);

    const headers = { 'content-type': 'application/json' };
    if (bearerToken) headers['authorization'] = `Bearer ${bearerToken}`;

    const result = await fetchJson(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(jsonBody),
    });

    return {
      content: [
        {
          type: 'text',
          text: truncateString(JSON.stringify(result, null, 2), 12000),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
