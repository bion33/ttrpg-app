/**
 * The hue-derived colours of the binder spine and paper tabs, each the single definition of that colour so the same
 * tone is reused wherever it appears rather than redrawn. Each takes a hue in degrees and returns a CSS colour string.
 */

// ---- INTERNAL CONSTANTS ----

const BINDER_SATURATION = 45 // saturation (%) of every binder-spine tone

// ---- EXPORTED FUNCTIONS ----

/**
 * The lighter stop of a binder spine's gradient at the given hue.
 */
export function binderSpineLight(hue: number): string {
    return `hsl(${hue} ${BINDER_SATURATION}% 46%)`
}

/**
 * The darker stop of a binder spine's gradient at the given hue.
 */
export function binderSpineDark(hue: number): string {
    return `hsl(${hue} ${BINDER_SATURATION}% 34%)`
}

/**
 * The representative solid binder-spine colour at the given hue (the gradient's midpoint).
 */
export function binderSpineColor(hue: number): string {
    return `hsl(${hue} ${BINDER_SATURATION}% 40%)`
}

/**
 * The paper page-tab colour at the given hue.
 */
export function tabColor(hue: number): string {
    return `hsl(${hue} 55% 82%)`
}

/**
 * The hued border colour of the active tab's page at the given tab hue — a dark accent of the tab's own hue.
 */
export function tabBorderColor(hue: number): string {
    return `hsl(${hue} 45% 40%)`
}
