/**
 * The message carried by a caught error, or the given fallback when the value is not an Error.
 */
export function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback
}
