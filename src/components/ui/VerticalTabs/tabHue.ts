/**
 * Hue (degrees) for the tab at the given index; the strip cycles amber → green → blue → rose.
 */
export function tabHue(index: number): number {
    return 38 + index * 78
}
