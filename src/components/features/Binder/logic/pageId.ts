/**
 * Turns a page name into a slug id: lowercase, only latin alphanumerics and single dashes, no leading/trailing dash.
 */
export function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/**
 * A slug id guaranteed not to collide with any of `taken`, suffixing `-2`, `-3`, … when the base slug is in use.
 */
export function uniqueId(name: string, taken: readonly string[]): string {
    const base = slugify(name) || 'page'
    if (!taken.includes(base)) return base
    let n = 2
    while (taken.includes(`${base}-${n}`)) n++
    return `${base}-${n}`
}
