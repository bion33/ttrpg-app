/**
 * The decoded contents of an image-or-textarea field: its prose text and its image URL ('' = none). Both are held
 * together so switching between them never loses the other.
 */
export interface ImageTextareaValue {
    text: string
    imageUrl: string
}

/**
 * Decodes an image-or-textarea field's stored string into its text and image URL, tolerating an empty or malformed
 * value (treated as empty text and no image).
 */
export function parseImageTextareaValue(raw: string): ImageTextareaValue {
    if (!raw) return {text: '', imageUrl: ''}
    try {
        const parsed = JSON.parse(raw) as Partial<ImageTextareaValue>
        return {text: parsed.text ?? '', imageUrl: parsed.imageUrl ?? ''}
    } catch {
        return {text: '', imageUrl: ''}
    }
}

/**
 * Encodes an image-or-textarea field's text and image URL into its stored string.
 */
export function serializeImageTextareaValue(value: ImageTextareaValue): string {
    return JSON.stringify(value)
}
