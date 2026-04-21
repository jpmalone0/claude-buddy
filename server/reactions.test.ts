/**
 * Unit tests for reactions.ts.
 *
 * Unlike engine.ts, reactions.ts uses Math.random() and is therefore not
 * deterministic. We can still make solid assertions about invariants:
 *
 *   - the shape of the return value (non-empty string)
 *   - template placeholder substitution
 *
 * Each non-deterministic assertion is run many times so that a single
 * lucky RNG pick cannot hide a real bug.
 */

import { describe, test, expect } from "bun:test";
import {
  getReaction,
  generateFallbackName,
} from "./reactions.ts";
import { SPECIES, RARITIES, STAT_NAMES } from "./engine.ts";

// ─── getReaction ──────────────────────────────────────────────────────────

describe("getReaction", () => {
  const REASONS = [
    "hatch",
    "pet",
    "error",
    "test-fail",
    "large-diff",
    "turn",
    "idle",
  ] as const;

  test("returns a non-empty string for every (reason, species, rarity) combo", () => {
    for (const reason of REASONS) {
      for (const species of SPECIES) {
        for (const rarity of RARITIES) {
          const r = getReaction(reason, species, rarity);
          expect(typeof r).toBe("string");
          expect(r.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("substitutes {line} placeholder when context.line is provided", () => {
    // The "error" pool contains a template with {line}. Run enough times that
    // we're very likely to hit it at least once, then assert the substitution.
    let sawSubstitution = false;
    for (let i = 0; i < 500; i++) {
      const r = getReaction("error", "owl", "common", { line: 42 });
      if (r.includes("42")) {
        sawSubstitution = true;
      }
      // Regardless of which template is picked, {line} must not leak through
      expect(r).not.toContain("{line}");
    }
    expect(sawSubstitution).toBe(true);
  });

  test("substitutes {count} placeholder in test-fail reactions", () => {
    let sawSubstitution = false;
    for (let i = 0; i < 500; i++) {
      const r = getReaction("test-fail", "robot", "common", { count: 7 });
      if (r.includes("7")) sawSubstitution = true;
      expect(r).not.toContain("{count}");
    }
    expect(sawSubstitution).toBe(true);
  });

  test("substitutes {lines} placeholder in large-diff reactions", () => {
    let sawSubstitution = false;
    for (let i = 0; i < 500; i++) {
      const r = getReaction("large-diff", "dragon", "legendary", { lines: 999 });
      if (r.includes("999")) sawSubstitution = true;
      expect(r).not.toContain("{lines}");
    }
    expect(sawSubstitution).toBe(true);
  });

  test("works without a context argument", () => {
    for (let i = 0; i < 50; i++) {
      const r = getReaction("pet", "cat", "rare");
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(0);
    }
  });

  test("species with no custom pool still returns a general reaction", () => {
    // 'chonk' intentionally has no species-specific entries in reactions.ts
    for (const reason of REASONS) {
      for (let i = 0; i < 20; i++) {
        const r = getReaction(reason, "chonk", "common");
        expect(r.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─── generateFallbackName ─────────────────────────────────────────────────

describe("generateFallbackName", () => {
  test("returns a non-empty string", () => {
    for (let i = 0; i < 20; i++) {
      const name = generateFallbackName();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("names look like words: capitalized, alphabetic, reasonable length", () => {
    for (let i = 0; i < 100; i++) {
      const name = generateFallbackName();
      // Starts with uppercase, followed by lowercase letters only
      expect(name).toMatch(/^[A-Z][a-z]+$/);
      // Reasonable length bounds for the curated list
      expect(name.length).toBeGreaterThanOrEqual(3);
      expect(name.length).toBeLessThanOrEqual(12);
    }
  });

  test("picks multiple distinct names over many calls", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateFallbackName());
    }
    // With 18 names in the pool, 200 draws should produce well more than one.
    expect(seen.size).toBeGreaterThan(1);
  });
});
