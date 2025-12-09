import os
import sys
from dotenv import load_dotenv
from crewai import Task, Crew, Process
from agents import get_software_development_crew

# Ensure stdout/stderr can handle Unicode logs from CrewAI agents.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

load_dotenv()

try:
    with open("task.md", "r", encoding="utf-8") as f:
        feature_to_build = f.read()
except FileNotFoundError:
    print("FATAL ERROR: 'task.md' not found. Please create it and define the feature to build.")
    sys.exit(1)

print(f"--- Loaded Task ---\n{feature_to_build}\n-------------------")

agents = get_software_development_crew()
solutions_architect, senior_developer, qa_engineer = agents
tools_enabled = os.environ.get("CREW_ENABLE_TOOLS", "false").lower() == "true"
if not tools_enabled:
    print("Tool calling is disabled (set CREW_ENABLE_TOOLS=true to enable safe file tools).")

# Quick sanity check to ensure the LLM responds with a non-empty message.
sanity_task = Task(
    description="Reply with the single word: OK",
    expected_output="OK",
    agent=solutions_architect,
)
sanity_crew = Crew(
    agents=[solutions_architect],
    tasks=[sanity_task],
    process=Process.sequential,
    verbose=False,
)
sanity_result = sanity_crew.kickoff()
if not sanity_result or not str(sanity_result).strip():
    raise RuntimeError("LLM sanity check failed: empty response from the model.")
print(f"LLM sanity check passed: {sanity_result}")

plan_task = Task(
    description=f"Design a detailed technical plan for the following task: {feature_to_build}",
    expected_output="A clear, step-by-step technical plan.",
    agent=solutions_architect,
)

dev_task = Task(
    description=(
        "Based on the plan, write all necessary code. "
        "Use the file writing tool to save your work to the correct relative paths "
        "(e.g., 'CRM/backend/main.py')."
    ),
    expected_output="Confirmation that all files have been created/updated.",
    agent=senior_developer,
    context=[plan_task],
)

qa_task = Task(
    description=(
        "Review the plan and code. Ensure it perfectly matches the requirements. "
        "Provide a final report."
    ),
    expected_output="A comprehensive final report confirming task completion.",
    agent=qa_engineer,
    context=[dev_task],
)

project_crew = Crew(
    agents=agents,
    tasks=[plan_task, dev_task, qa_task],
    process=Process.sequential,
    verbose=False,
)

print("Orchestrator Activated. Launching the Software Development Crew...")
result = project_crew.kickoff()

if not result or not str(result).strip():
    raise RuntimeError("Crew finished but returned an empty response; check LLM configuration.")

print("\n\nGRAND TASK COMPLETED")
print("\n--- Final Report from the Quality Assurance Engineer ---\n")
print(result)
