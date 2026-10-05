import {parseImageTextareaValue} from '@lib/fields/imageTextareaValue.ts'
import {isImagePath} from './imageKey.ts'

// Matches the link target of a markdown image (`![alt](target)`), capturing the target so a notes body's embedded
// images are collected alongside field values.
const MARKDOWN_IMAGE = /!\[[^\]]*]\(([^)\s]+)\)/g

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
        collectFromValue(value, referenced)
    }
    return referenced
}
