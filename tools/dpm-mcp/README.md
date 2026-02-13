# DPM MCP (Internal)

Internal MCP server for developer productivity.

Goals:
- One official provider (OpenAI) via API key.
- Safe, localhost-only access to CRM backend API.
- Least-privilege by default (read-only).

## Run

```powershell
cd tools/dpm-mcp
npm i
$env:DPM_CRM_BASE_URL="http://127.0.0.1:8000/api/v1"
$env:OPENAI_API_KEY="<your_key>"
node src/dpm-mcp-server.js
```

## Environment

- `DPM_CRM_BASE_URL`
  - Default: `http://127.0.0.1:8000/api/v1`
  - Guardrail: blocks non-localhost unless `DPM_ALLOW_NON_LOCALHOST=1`

- `DPM_MCP_MODE`
  - `read_only` (default)
  - `read_write` (enables POST tool)

- `OPENAI_API_KEY` (or `DPM_OPENAI_API_KEY`)

- `DPM_OPENAI_BASE_URL`
  - Default: `https://api.openai.com/v1`

- `DPM_OPENAI_MODEL`
  - Default: `gpt-4o-mini`

## MCP Client Config

Example snippet (Cursor/VS Code MCP extension):

```json
{
  "mcpServers": {
    "dpm": {
      "command": "node",
      "args": ["D:/ALQASEER_DEV/dopamine-crm-suite_PLAYGROUND/tools/dpm-mcp/src/dpm-mcp-server.js"],
      "env": {
        "DPM_CRM_BASE_URL": "http://127.0.0.1:8000/api/v1",
        "DPM_MCP_MODE": "read_only"
      }
    }
  }
}
```

## Tools

- `dpm_openai_chat`
- `dpm_backend_openapi`
- `dpm_backend_get`
- `dpm_backend_post` (only in `read_write`)
