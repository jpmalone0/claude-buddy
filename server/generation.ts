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

function bonesPromptBlock(bones: BuddyBones): string {
  const statLines = Object.entries(bones.stats)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  return [
    `Species: ${bones.species}`,
    `Rarity: ${bones.rarity}`,
    `Shiny: ${bones.shiny}`,
    `Stats: ${statLines}`,
    `Peak stat: ${bones.peak} (${bones.stats[bones.peak]})`,
    `Dump stat: ${bones.dump} (${bones.stats[bones.dump]})`,
  ].join("\n");
}

function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 '-]/g, "").slice(0, 14).trim();
}

export async function generateBuddy(
  bones: BuddyBones,
): Promise<{ name: string; personality: string }> {
  const prompt = [
    bonesPromptBlock(bones),
    "",
    "Generate both a NAME and PERSONALITY for this coding companion.",
    "Be specific to this creature's stats and species — no generic filler.",
    "Reply in exactly this format, with no preamble or extra lines:",
    "NAME: <1-2 words, gender-neutral, evocative>",
    "PERSONALITY: <2 sentences max; plain and dry, like a field guide entry; no metaphors, no dramatic adjectives; just what this creature does and how it acts>",
  ].join("\n");

  try {
    const text = await queryClaude(prompt);
    const nameMatch = text.match(/^\s*NAME:\s*(.+?)\s*$/mi);
    const personalityMatch = text.match(/PERSONALITY:\s*([\s\S]+?)\s*$/i);
    const name = sanitizeName(nameMatch?.[1] ?? "");
    const personality = (personalityMatch?.[1] ?? "").trim();
    if (!name || !personality) throw new Error("unparseable response");
    return { name, personality };
  } catch {
    return {
      name: "TryAgainLater",
      personality: "This creature doesn't want to tell you about itself right now.",
    };
  }
}

export async function generatePersonality(bones: BuddyBones): Promise<string> {
  const prompt = [
    bonesPromptBlock(bones),
    "",
    "Write 2 sentences max describing this coding companion. Plain and dry — like a field guide entry, not a fantasy novel.",
    "No metaphors, no dramatic adjectives, no poetic language. Just what it does and how it behaves.",
    "Be specific to the stats and species.",
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
    return sanitizeName(text) || "TryAgainLater";
  } catch {
    return "TryAgainLater";
  }
}
