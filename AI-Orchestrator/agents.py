import os
from crewai import Agent, LLM
from tools import safe_file_read, safe_file_write

# ============================================================
#  إعداد الـ LLM: تشغيل CrewAI على Ollama (موديل llama3)
# ============================================================

BASE_URL = os.environ.get("OPENAI_BASE_URL", "http://127.0.0.1:11434/v1")
MODEL_NAME = os.environ.get("OPENAI_MODEL", "llama3")
API_KEY = os.environ.get("OPENAI_API_KEY", "ollama")
TEMPERATURE = float(os.environ.get("OPENAI_TEMPERATURE", "0.2"))
ENABLE_TOOLS = os.environ.get("CREW_ENABLE_TOOLS", "false").lower() == "true"
COMMON_TOOLS = [safe_file_read, safe_file_write] if ENABLE_TOOLS else []

llm = LLM(
    model=MODEL_NAME,
    base_url=BASE_URL,
    api_key=API_KEY,
    temperature=TEMPERATURE,
)


def get_software_development_crew():
    """Return the main agents that will work on the CRM & PWA codebase."""

    solutions_architect = Agent(
        role="World-Class Solutions Architect",
        goal=(
            "Design robust, modular architectures for the ALQASEER CRM backend "
            "and ALQASEER-PWA frontend, making them easy to extend and test."
        ),
        backstory=(
            "You always start by READING existing code with safe_file_read "
            "before proposing changes. You avoid breaking working endpoints."
        ),
        llm=llm,
        tools=COMMON_TOOLS if ENABLE_TOOLS else [],
        verbose=False,
    )

    senior_developer = Agent(
        role="Senior Backend & Full-Stack Developer",
        goal=(
            "Implement clean, production-ready Python/FastAPI code for the CRM backend "
            "and coordinate with the PWA frontend when needed."
        ),
        backstory=(
            "You are careful with file paths and only write inside the CRM and "
            "ALQASEER-PWA folders using safe_file_write. You keep code readable and well-structured."
        ),
        llm=llm,
        tools=COMMON_TOOLS if ENABLE_TOOLS else [],
        verbose=False,
    )

    qa_engineer = Agent(
        role="Quality Assurance & Code Review Specialist",
        goal=(
            "Review the technical plan and the generated code to ensure correctness, "
            "consistency, and readiness for production."
        ),
        backstory=(
            "You verify endpoints, structure, error handling, and leave clear TODOs "
            "for future improvements."
        ),
        llm=llm,
        tools=COMMON_TOOLS if ENABLE_TOOLS else [],
        verbose=False,
    )

    return solutions_architect, senior_developer, qa_engineer
