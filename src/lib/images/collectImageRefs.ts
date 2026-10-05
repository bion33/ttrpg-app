import {parseImageTextareaValue} from '@lib/fields/imageTextareaValue.ts'
import {isImagePath} from './imageKey.ts'

// Matches the link target of a markdown image (`![alt](target)`), capturing the target so a notes body's embedded
// images are collected alongside field values.
const MARKDOWN_IMAGE = /!\[[^\]]*]\(([^)\s]+)\)/g

// Recovers the underlying string an entry holds: a snapshot value is the JSON-encoded form localStorage stores, so a
// field's path, an image-or-textarea value, and a markdown body all arrive quote-wrapped and must be decoded before
// scanning. A non-string entry (an object/array, e.g. the binders list) carries no image reference, so it is dropped;
// a value that is not valid JSON is scanned as-is.
function decodeEntry(value: string): string {
    try {
        const parsed: unknown = JSON.parse(value)
        return typeof parsed === 'string' ? parsed : ''
    } catch {
        return value
    }
}

// Adds every stored image path found in one value to the accumulating set: the value verbatim (a plain image field),
// the image inside an image-or-textarea JSON value, and any markdown image targets (a notes body). Matches only exact
// `images/…` paths, so an arbitrary markdown or text body is never itself mistaken for a path.
function collectFromValue(value: string, into: Set<string>): void {
    if (isImagePath(value)) into.add(value)

    const {imageUrl} = parseImageTextareaValue(value)
    if (isImagePath(imageUrl)) into.add(imageUrl)

    for (const match of value.matchAll(MARKDOWN_IMAGE)) {
        if (isImagePath(match[1])) into.add(match[1])
    }
}

/**
 * The set of local image paths referenced anywhere in a snapshot's entries — plain image fields, image-or-textarea
 * fields, and markdown notes bodies. The single source of truth for both local GC and cloud-folder reconciliation.
 */
export function collectImageRefs(entries: Record<string, string>): Set<string> {
    const referenced = new Set<string>()
    for (const value of Object.values(entries)) {
        collectFromValue(decodeEntry(value), referenced)
    }
    return referenced
}
