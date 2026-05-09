/**
 * Reaction emoji presets for new boards, plus legacy sets already stored in the DB.
 */

export const REACTION_EMOJI_PRESETS = [
  ["👍", "👎", "🤔", "❌"], // yes / no / thinking / veto
  ["❤️", "👍", "🤷", "👎"], // how much you want it
  ["🔥", "👌", "💤", "🚫"], // energy / later / blocked
  ["⭐", "✅", "🤷", "❌"], // strong pick / good / unsure / no
  ["🎉", "🙂", "😐", "😕"], // delighted → disappointed
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

export const DEFAULT_REACTION_EMOJI_SET: string[] = [...REACTION_EMOJI_PRESETS[0]];

export const ALLOWED_REACTION_EMOJIS = new Set<string>([
  ...LEGACY_PRESET_EMOJIS,
  ...REACTION_EMOJI_PRESETS.flatMap((row) => [...row]),
]);
