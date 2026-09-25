/**
 * Layout for one overlay field, in the artwork's viewBox coordinate space (not pixels).
 */
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
