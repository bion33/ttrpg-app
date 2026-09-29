/**
 * The hue-derived colours of the binder spine and paper tabs, defined once here and shared by both the CSS surfaces
 * (which consume them as inline custom properties) and the modal live previews, so a colour never drifts between the
 * two. Each takes a hue in degrees and returns a CSS colour string.
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
 * The darker stop of a binder spine's gradient at the given hue (also the portrait-letter colour).
 */
export function binderSpineDark(hue: number): string {
    return `hsl(${hue} ${BINDER_SATURATION}% 34%)`
}

/**
 * The representative solid binder-spine colour at the given hue (the gradient's midpoint), used for the edit preview.
 */
export function binderSpineColor(hue: number): string {
    return `hsl(${hue} ${BINDER_SATURATION}% 40%)`
}

/**
 * The paper page-tab colour at the given hue, shared by the tab strip's background and the tab edit preview.
 */
export function tabColor(hue: number): string {
    return `hsl(${hue} 55% 82%)`
}
