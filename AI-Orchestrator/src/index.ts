import { runBackendHealth } from "./tasks/backendHealth";
import { buildCodexPromptFromLatestReport } from "./tasks/backendPrompt";
import { runDailyOrchestration } from "./tasks/dailyRun";
import { runMultiProjectDaily } from "./tasks/dailyMultiProject";
import { buildPromptsFromLatestMultiSummary } from "./tasks/multiProjectPrompt";
import { generateTaskFiles, buildInstructionSnippets } from "./tasks/taskGenerator";

async function main() {
  const cmd = process.argv[2];

  if (cmd === "backend:test") {
    const result = await runBackendHealth();
    process.exit(result.exitCode);
  }

  if (cmd === "backend:prompt") {
    const result = await buildCodexPromptFromLatestReport();
    if (result.ok) {
      console.log(result.message);
      console.log(`Prompt saved to: ${result.outputPath}`);
      process.exit(0);
    } else {
      console.log(result.message);
      process.exit(1);
    }
  }

  if (cmd === "daily:run") {
    const summary = await runDailyOrchestration();
    console.log("[DAILY SUMMARY]");
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  if (cmd === "daily:multiproject") {
    const { summary } = await runMultiProjectDaily();
    console.log("[MULTI PROJECT DAILY SUMMARY]");
    console.log(JSON.stringify(summary, null, 2));
    process.exit(0);
  }

  if (cmd === "daily:multiproject:prompts") {
    const { summary } = await runMultiProjectDaily();
    const promptResult = await buildPromptsFromLatestMultiSummary();
    console.log("[MULTI PROJECT DAILY SUMMARY]");
    console.log(JSON.stringify(summary, null, 2));
    console.log(promptResult.message);
    if (promptResult.prompts?.length) {
      console.log("Generated prompts:");
      promptResult.prompts.forEach((p) => console.log(`- ${p}`));
    }
    process.exit(promptResult.ok ? 0 : 1);
  }

  if (cmd === "orchestrate:full" || cmd === "daily:auto") {
    const { summary, reports } = await runMultiProjectDaily();
    generateTaskFiles(reports);
    const snippets = buildInstructionSnippets(reports);
    console.log("[MULTI PROJECT DAILY SUMMARY]");
    console.log(JSON.stringify(summary, null, 2));
    console.log("Task markdown files generated in D:/CRM ALQASEER/CRM/prompts");
    console.log("Copy/paste snippets for Codex/Aider:");
    snippets.forEach((s) => console.log(`${s}\n`));
    process.exit(0);
  }

  console.log(
    "Usage: node dist/index.js backend:test | backend:prompt | daily:run | daily:multiproject | daily:multiproject:prompts | orchestrate:full"
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
