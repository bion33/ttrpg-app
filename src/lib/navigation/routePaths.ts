/**
 * The app's URL paths, built in one place so every surface that navigates (links, tab switches, redirects) and the
 * route table agree on their shape. Slugs are namespaced under `/binders` and `/templates` so they cannot collide with
 * the reserved top-level paths.
 */

/** The library shelf. */
export function libraryPath(): string {
    return '/'
}

/**
 * A binder, optionally at one of its pages. Omitting the page addresses the binder itself (its remembered page).
 */
export function binderPath(binderSlug: string, pageSlug?: string): string {
    return pageSlug ? `/binders/${binderSlug}/${pageSlug}` : `/binders/${binderSlug}`
}

/** A markdown template open in its editor surface. */
export function templatePath(templateSlug: string): string {
    return `/templates/${templateSlug}`
}
