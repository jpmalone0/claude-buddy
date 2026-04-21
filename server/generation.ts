import Anthropic from "@anthropic-ai/sdk";
import type { BuddyBones } from "./engine.ts";

const client = new Anthropic();

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
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
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
    const msg = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 20,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    if (!text) throw new Error("empty response");
    // Strip any stray punctuation and truncate to 14 chars
    return text.replace(/[^a-zA-Z0-9 '-]/g, "").slice(0, 14).trim() || "TryAgainLater";
  } catch {
    return "TryAgainLater";
  }
}
