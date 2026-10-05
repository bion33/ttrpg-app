import {isHttpUrl} from '@lib/url/httpUrl.ts'

// The folder every stored image path lives under, so a path is at once the OPFS path, the markdown link target, the
// cloud filename, and the zip entry.
const IMAGE_FOLDER = 'images'

/**
 * Whether an image field/link value is a remote http(s) URL (rendered as-is) rather than a stored local image.
 */
export function isRemoteUrl(value: string): boolean {
    return isHttpUrl(value)
}

/**
 * Whether an image field/link value is a stored local image — a non-empty value that is not a remote URL, i.e. a
 * relative OPFS/cloud path such as `images/goblin-portrait-a1b2.png`.
 */
export function isLocalImage(value: string): boolean {
    return value !== '' && !isRemoteUrl(value)
}

/**
 * Whether a value is a stored image path specifically — under the `images/` folder with no whitespace. Stricter than
 * `isLocalImage`, for scanning arbitrary snapshot values (e.g. a markdown body) where only exact paths should count.
 */
export function isImagePath(value: string): boolean {
    return /^images\/\S+$/.test(value)
}

/**
 * The lower-cased file extension of a filename without its dot (e.g. `png`), or '' when the name has no extension.
 */
export function imageExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    if (lastDot < 0 || lastDot === fileName.length - 1) return ''
    return fileName.slice(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, '')
}

// A filesystem-safe slug of a filename's base (no extension): lower-cased, non-alphanumerics collapsed to single
// dashes, with leading/trailing dashes trimmed; falls back to 'image' when nothing usable remains.
function slugFileName(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.')
    const base = lastDot > 0 ? fileName.slice(0, lastDot) : fileName
    const slug = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    return slug === '' ? 'image' : slug
}

/**
 * Builds the relative image path for an uploaded file from its name and a short unique suffix:
 * `images/<slug>-<suffix>.<ext>` (the extension omitted when the name has none). The suffix is supplied so this stays
 * pure and testable.
 */
export function buildImagePath(fileName: string, suffix: string): string {
    const extension = imageExtension(fileName)
    const base = `${IMAGE_FOLDER}/${slugFileName(fileName)}-${suffix}`
    return extension === '' ? base : `${base}.${extension}`
}
