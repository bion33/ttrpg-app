/**
 * Turns arbitrary text into a URL/filesystem-safe slug: lower-cased, with every run of non-alphanumeric characters
 * collapsed to a single dash and leading/trailing dashes trimmed. Returns '' when nothing usable remains (the caller
 * supplies its own fallback). The single source for binder, page, template, heading, and image-file slugs.
 */
export function slugify(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

// Returns `slug` if free, otherwise the first `slug-2`, `slug-3`, … not already in `used`.
function disambiguate(slug: string, used: Set<string>): string {
    if (!used.has(slug)) return slug
    let suffix = 2
    while (used.has(`${slug}-${suffix}`)) suffix++
    return `${slug}-${suffix}`
}

/**
 * Makes a list of slugs unique in order: the first occurrence of each slug is kept and later duplicates gain the
 * lowest free `-2`, `-3`, … suffix. Used to assign frozen ids to a sibling set (binders, a binder's pages, templates,
 * headings) deterministically.
 */
export function dedupeSlugs(slugs: string[]): string[] {
    const used = new Set<string>()
    return slugs.map((slug) => {
        const unique = disambiguate(slug, used)
        used.add(unique)
        return unique
    })
}

/**
 * The frozen slug id for one new item added to a sibling set: `slugify(label)` (or `fallback` when it yields nothing),
 * disambiguated against the siblings' existing slugs with the same rule as `dedupeSlugs`, so creation and the one-off
 * migration converge on the same ids.
 */
export function uniqueSlug(label: string, existingSlugs: string[], fallback: string): string {
    return disambiguate(slugify(label) || fallback, new Set(existingSlugs))
}
