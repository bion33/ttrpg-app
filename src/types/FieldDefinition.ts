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
  type: 'text' | 'number' | 'checkbox'
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
  defaultValue?: string
}
