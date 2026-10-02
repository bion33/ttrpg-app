/**
 * Physical paper widths in CSS pixels: the single source of truth for page footprints, shared by the page components
 * (which render at these widths) and the zoom math (which scales them to a fraction of the viewport).
 */

// The CSS reference pixel is 1/96 inch, so a physical millimetre size maps to pixels at this resolution.
export const CSS_DPI = 96
const MILLIMETRES_PER_INCH = 25.4

/**
 * Converts a physical length in millimetres to CSS pixels at the standard 96dpi reference resolution.
 */
export function millimetresToPixels(millimetres: number): number {
    return (millimetres / MILLIMETRES_PER_INCH) * CSS_DPI
}

// The A4 and A5 portrait widths (210mm / 148mm) as CSS pixels, so a sheet on screen matches the printed page.
export const A4_WIDTH_PX = millimetresToPixels(210)
export const A5_WIDTH_PX = millimetresToPixels(148)

// The A4 portrait aspect ratio (height / width), so a sheet's height follows from its width in any unit.
export const A4_ASPECT_RATIO = 297 / 210
