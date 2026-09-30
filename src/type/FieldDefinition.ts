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
    fontSize?: number
    // Horizontal text alignment; 'number' fields default to 'center'.
    textAlign?: 'left' | 'center' | 'right'
    defaultValue?: number | boolean | string
}

