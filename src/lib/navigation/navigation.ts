/**
 * A place in the app the user can navigate to and step back and forward through: which binder is open (empty for the
 * library shelf) and, within it, which page is active (empty when none); or, instead of a binder, a markdown template
 * open in its editor surface.
 */
export interface Location {
    binderId: string
    pageId: string
    markdownTemplateId?: string
}

/**
 * The library shelf location: no binder open, no page active, and no markdown template open.
 */
export function libraryLocation(): Location {
    return {binderId: '', pageId: ''}
}

/**
 * The editor-surface location for a markdown template open by its id.
 */
export function markdownTemplateLocation(markdownTemplateId: string): Location {
    return {binderId: '', pageId: '', markdownTemplateId}
}

/**
 * Whether a location is the library shelf (no binder open and no markdown template open).
 */
export function isLibrary(location: Location): boolean {
    return location.binderId === '' && !location.markdownTemplateId
}

/**
 * Whether a location is a markdown template open in its editor surface.
 */
export function isMarkdownTemplate(location: Location): boolean {
    return !!location.markdownTemplateId
}

/**
 * Whether two locations point at the same binder and page and markdown template.
 */
export function sameLocation(first: Location, second: Location): boolean {
    return first.binderId === second.binderId
        && first.pageId === second.pageId
        && first.markdownTemplateId === second.markdownTemplateId
}
