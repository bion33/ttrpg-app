/**
 * Required-environment accessor: reads a variable (or a fallback), throwing when neither is set, so a misconfigured
 * OAuth relay fails loudly at first use rather than forwarding a broken request.
 */
export function env(name: string, fallback?: string): string {
    const value = process.env[name] ?? fallback
    if (value === undefined || value === '') throw new Error(`Missing required environment variable: ${name}`)
    return value
}
