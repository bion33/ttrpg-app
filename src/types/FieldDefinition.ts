// Overlay field positions, in the *same* coordinate space as the artwork's
// viewBox (not pixels). Because both the <image>/<path> artwork and these
// <foreignObject> inputs live inside one <svg viewBox="...">, the browser
// scales them together - no separate resize-tracking logic needed.
export type FieldDefinition = {
    id: string
    x: number
    y: number
    width: number
    height: number
    type: 'text' | 'textarea' | 'number' | 'check'
    // Checkbox mark shape; defaults to 'circle' when omitted.
    shape?: 'circle' | 'diamond' | 'star'
    // Checkbox fill color; defaults to 'black' (the artwork ink) when omitted.
    color?: 'black' | 'green' | 'goldenrod' | 'firebrick'
    fontSize?: number
    // Horizontal text alignment; 'number' fields default to 'center'.
    textAlign?: 'left' | 'center' | 'right'
    defaultValue?: string
}
