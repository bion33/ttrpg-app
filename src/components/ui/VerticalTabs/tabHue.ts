/**
 * Hue (degrees) for the tab at the given index; successive tabs step by the golden angle so any number of tabs
 * stay well separated in colour and near neighbours never share a hue.
 */
export function tabHue(index: number): number {
    return (38 + index * 137.5) % 360
}
