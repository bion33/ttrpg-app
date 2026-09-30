/**
 * A place in the app the user can navigate to and step back and forward through: which binder is open (empty for the
 * library shelf) and, within it, which page is active (empty when none).
 */
export interface Location {
    binderId: string
    pageId: string
}

/**
 * The library shelf location: no binder open and no page active.
 */
export function libraryLocation(): Location {
    return {binderId: '', pageId: ''}
}

/**
 * Whether a location is the library shelf (no binder open).
 */
export function isLibrary(location: Location): boolean {
    return location.binderId === ''
}

/**
 * Whether two locations point at the same binder and page.
 */
export function sameLocation(first: Location, second: Location): boolean {
    return first.binderId === second.binderId && first.pageId === second.pageId
}
