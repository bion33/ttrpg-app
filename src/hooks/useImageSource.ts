import {useEffect, useState} from 'react'
import {isRemoteUrl} from '@lib/images/imageKey.ts'
import {readImage, subscribeToImageWrites} from '@lib/images/imageStore.ts'

// A settled local image load: the value it resolved for and its blob URL (null when that value has no stored bytes).
// The resolved value lets a stale load be ignored after the value changes (the old blob URL is revoked on cleanup, so
// it must never be returned for a different value), and separates "still loading" from "settled but missing".
interface ResolvedLocal {
    forValue: string
    url: string | null
}

/**
 * A resolved image value: the renderable `<img src>` (undefined while loading, empty, or missing) and whether a local
 * image is still loading, so a caller can show a loader instead of its empty-state fallback.
 */
export interface ImageSource {
    src: string | undefined
    loading: boolean
}

/**
 * Resolves an image field/markdown value to a renderable `<img src>`: a remote http(s) URL is returned unchanged; a
 * local OPFS path is loaded to a session-scoped `blob:` URL, revoked on value-change/unmount. Reports `loading` while a
 * local image resolves. Re-resolves when its image is (re)written to the OPFS, so an image that arrives after first
 * render — e.g. downloaded during a background cloud sync — appears without a reload.
 */
export function useImageSource(value: string): ImageSource {
    const [resolved, setResolved] = useState<ResolvedLocal | null>(null)
    // Bumped when this value's bytes are (re)written, to re-run the load effect below.
    const [writeToken, setWriteToken] = useState(0)

    // A remote URL (or empty) resolves synchronously during render; a local path resolves asynchronously below.
    const isLocal = value !== '' && !isRemoteUrl(value)

    // Re-resolve when this exact image path is written to the OPFS (an upload or a background download).
    useEffect(() => {
        if (!isLocal) return
        return subscribeToImageWrites((path) => {
            if (path === value) setWriteToken((token) => token + 1)
        })
    }, [value, isLocal])

    useEffect(() => {
        if (!isLocal) return
        let objectUrl: string | null = null
        let active = true
        void (async () => {
            const blob = await readImage(value)
            if (!active) return
            objectUrl = blob ? URL.createObjectURL(blob) : null
            setResolved({forValue: value, url: objectUrl})
        })()
        return () => {
            active = false
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [value, isLocal, writeToken])

    if (!isLocal) return {src: value === '' ? undefined : value, loading: false}
    // The load has settled only once it matches the current value; until then it is loading (or stale, being revoked).
    const settled = resolved && resolved.forValue === value
    return {src: settled ? resolved.url ?? undefined : undefined, loading: !settled}
}
