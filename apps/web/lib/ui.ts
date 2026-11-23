// Shared visual system for the marketing pages: one radius, one tinted
// shadow, one CTA recipe. Pages compose these instead of local constants.
export const RADIUS = "rounded-xl";
export const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";
export const CTA_BASE = `h-auto gap-2 ${RADIUS} px-6 py-3.5 font-semibold whitespace-nowrap transition-transform active:scale-[0.98]`;
