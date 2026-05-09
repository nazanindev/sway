/**
 * Reaction emoji presets for new boards, plus legacy sets already stored in the DB.
 * Labels describe the scheme on the create screen; emojis appear on the board only.
 */

export const REACTION_EMOJI_PRESETS = [
  { label: "Yes / no", emojis: ["👍", "👎", "🤔", "❌"] },
  { label: "Want it", emojis: ["❤️", "👍", "🤷", "👎"] },
  { label: "Priority", emojis: ["🔥", "👌", "💤", "🚫"] },
  { label: "Pick", emojis: ["⭐", "✅", "🤷", "❌"] },
  { label: "Mood", emojis: ["🎉", "🙂", "😐", "😕"] },
] as const;

/** Older boards may still use these sets — reactions must remain valid. */
const LEGACY_PRESET_EMOJIS = [
  "❤️",
  "🔥",
  "🤔",
  "❌",
  "👍",
  "👎",
  "🤷",
  "💯",
  "⭐",
  "💡",
  "💸",
  "🚫",
  "😍",
  "🚀",
  "💀",
  "🤌",
  "✨",
  "😭",
  "💅",
  "🫡",
] as const;

export const DEFAULT_REACTION_EMOJI_SET: string[] = [...REACTION_EMOJI_PRESETS[0].emojis];

export const ALLOWED_REACTION_EMOJIS = new Set<string>([
  ...LEGACY_PRESET_EMOJIS,
  ...REACTION_EMOJI_PRESETS.flatMap((p) => [...p.emojis]),
]);
