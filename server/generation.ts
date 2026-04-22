import type { BuddyBones } from "./engine.ts";

const QUERY_SYSTEM_PROMPT =
  "You write in-world flavor text for a creature-collecting game. " +
  "Reply with ONLY the requested content — no preamble, no postamble, " +
  "no meta-commentary, no markdown headers, no explanation.";

async function queryClaude(prompt: string): Promise<string> {
  // Strip ANTHROPIC_API_KEY so `claude` uses the Pro subscription auth
  // rather than a (possibly depleted) API-key account.
  const { ANTHROPIC_API_KEY, ...env } = process.env;

  const proc = Bun.spawn(
    [
      "claude", "-p",
      "--model", "haiku",
      "--tools", "",
      "--strict-mcp-config",
      "--mcp-config", '{"mcpServers":{}}',
      "--system-prompt", QUERY_SYSTEM_PROMPT,
      prompt,
    ],
    { stdout: "pipe", stderr: "pipe", env },
  );
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  if (proc.exitCode !== 0) {
    throw new Error(`claude CLI exited ${proc.exitCode}: ${stderr.trim() || stdout.trim()}`);
  }
  return stdout.trim();
}

export async function generatePersonality(bones: BuddyBones): Promise<string> {
  const statLines = Object.entries(bones.stats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const prompt = [
    `Species: ${bones.species}`,
    `Rarity: ${bones.rarity}`,
    `Shiny: ${bones.shiny}`,
    `Stats: ${statLines}`,
    `Peak stat: ${bones.peak} (${bones.stats[bones.peak]})`,
    `Dump stat: ${bones.dump} (${bones.stats[bones.dump]})`,
    "",
    "Write 3-4 sentences of trading-card / creature-compendium flavor text for this coding companion.",
    "Stay fully in-world — no meta-commentary. Describe behavior, quirks, and character.",
    "Be specific to this creature's stats and species. Do not use generic filler.",
  ].join("\n");

  try {
    const text = await queryClaude(prompt);
    if (!text) throw new Error("empty response");
    return text;
  } catch {
    return "This creature doesn't want to tell you about itself right now.";
  }
}

export async function generateName(
  bones: BuddyBones,
  personality: string,
): Promise<string> {
  const prompt = [
    `Species: ${bones.species}`,
    `Rarity: ${bones.rarity}`,
    `Personality: ${personality}`,
    "",
    "Give this coding companion a name. 1-2 words, gender-neutral, evocative.",
    "Reply with ONLY the name — no punctuation, no explanation.",
  ].join("\n");

  try {
    const text = await queryClaude(prompt);
    if (!text) throw new Error("empty response");
    return text.replace(/[^a-zA-Z0-9 '-]/g, "").slice(0, 14).trim() || "TryAgainLater";
  } catch {
    return "TryAgainLater";
  }
}
