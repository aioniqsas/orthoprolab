// Shared visual system for the marketing pages: one radius, one tinted
// shadow, one CTA recipe, one vertical rhythm. Pages compose these instead of
// local constants.
export const RADIUS = "rounded-xl";
export const TINTED_SHADOW = "shadow-[0_24px_48px_-24px_rgba(86,137,143,0.4)]";
export const CTA_BASE = `h-auto gap-2 ${RADIUS} px-6 py-3.5 font-semibold whitespace-nowrap transition-transform motion-safe:active:scale-[0.98]`;

// Vertical rhythm roles. Pick by the section's job on the page, never by taste:
// the lead chapter is tight to the hero, a band opens a new chapter, tight
// content supports, the close lands last. Desktop values run 3.5rem → 8rem so
// consecutive sections cannot end up with the same weight.
export const SECTION_LEAD = "py-14 lg:py-20";
export const SECTION_BAND = "py-20 lg:py-28";
export const SECTION_TIGHT = "py-10 lg:py-14";
export const SECTION_CLOSE = "py-24 lg:py-32";

// Space under a heading. Always smaller than the tightest section top padding,
// so a heading keeps more air above it than below.
export const HEADING_GAP = "space-y-10 lg:space-y-12";
