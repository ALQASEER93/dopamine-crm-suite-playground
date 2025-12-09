import os
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field
from crewai.tools import BaseTool  # Ø§Ù†ØªØ¨Ù‡: crewai.tools ÙˆÙ„ÙŠØ³ crewai_tools


# Ù†Ø­Ø¯Ø¯ Ø¬Ø°Ø± Ø§Ù„Ù…Ø´Ø±ÙˆØ¹: Ù…Ø¬Ù„Ø¯ "CRM ALQASEER"
# Ù‡Ø°Ø§ Ø§Ù„Ù…Ù„Ù Ù…ÙˆØ¬ÙˆØ¯ Ø¯Ø§Ø®Ù„: C:\\Users\\M\ S\ I\\ALQASEER_CRM_SUITE_FINAL\AI-Orchestrator\tools.py
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Ù†Ø³Ù…Ø­ ÙÙ‚Ø· Ø¨Ø§Ù„ÙˆØµÙˆÙ„ Ø¥Ù„Ù‰:
ALLOWED_ROOTS = {
    (PROJECT_ROOT / "CRM").resolve(),
    (PROJECT_ROOT / "ALQASEER-PWA").resolve(),
}


def _resolve_safe_path(relative_path: str) -> Path:
    """
    ÙŠØ­ÙˆÙ‘Ù„ Ø§Ù„Ù…Ø³Ø§Ø± Ø§Ù„Ù†Ø³Ø¨ÙŠ Ù…Ø«Ù„ 'CRM/backend/main.py' Ø¥Ù„Ù‰ Ù…Ø³Ø§Ø± ÙƒØ§Ù…Ù„
    ÙˆÙŠØªØ£ÙƒØ¯ Ø£Ù†Ù‡ Ø¯Ø§Ø®Ù„ CRM Ø£Ùˆ ALQASEER-PWA ÙÙ‚Ø·.
    """
    full_path = (PROJECT_ROOT / relative_path).resolve()
    if not any(str(full_path).startswith(str(root)) for root in ALLOWED_ROOTS):
        raise PermissionError(
            f"Access denied: {full_path} is outside CRM or ALQASEER-PWA."
        )
    return full_path


# ====== SafeFileReadTool =======================================================

class SafeFileReadArgs(BaseModel):
    file_path: str = Field(
        ...,
        description="Relative path inside CRM ALQASEER, e.g. 'CRM/backend/main.py'"
    )


class SafeFileReadTool(BaseTool):
    name: str = "safe_file_read"
    description: str = (
        "Read a UTF-8 text file inside the 'CRM ALQASEER' project. "
        "Use relative paths like 'CRM/backend/main.py'."
    )
    args_schema: type[BaseModel] = SafeFileReadArgs

    def _run(self, file_path: str) -> str:
        try:
            full_path = _resolve_safe_path(file_path)
        except PermissionError as e:
            return f"ERROR: {e}"

        if not full_path.exists():
            return f"ERROR: File not found: {full_path}"

        try:
            return full_path.read_text(encoding="utf-8")
        except Exception as e:
            return f"ERROR: Failed to read file {full_path}: {e}"


# ====== SafeFileWriteTool ======================================================

class SafeFileWriteArgs(BaseModel):
    file_path: str = Field(
        ...,
        description="Relative path inside CRM ALQASEER, e.g. 'CRM/backend/api/hcps.py'"
    )
    content: str = Field(
        ...,
        description="Full UTF-8 text content to write into the file."
    )


class SafeFileWriteTool(BaseTool):
    name: str = "safe_file_write"
    description: str = (
        "Write a UTF-8 text file inside the 'CRM ALQASEER' project. "
        "Use relative paths like 'CRM/backend/api/hcps.py'. "
        "Overwrites the file completely."
    )
    args_schema: type[BaseModel] = SafeFileWriteArgs

    def _run(self, file_path: str, content: str) -> str:
        try:
            full_path = _resolve_safe_path(file_path)
        except PermissionError as e:
            return f"ERROR: {e}"

        try:
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content, encoding="utf-8")
            return f"OK: Wrote {len(content)} chars to {full_path}"
        except Exception as e:
            return f"ERROR: Failed to write file {full_path}: {e}"


# Ù‡Ø°Ù‡ Ø§Ù„Ù€ Instances Ø§Ù„ØªÙŠ Ø³Ù†Ù…Ø±Ø±Ù‡Ø§ Ù„Ù„Ù€ Agents
safe_file_read = SafeFileReadTool()
safe_file_write = SafeFileWriteTool()

