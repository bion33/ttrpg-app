import {useEffect, useState} from 'react'
import {isRemoteUrl} from '@lib/images/imageKey.ts'
import {readImage, subscribeToImageWrites} from '@lib/images/imageStore.ts'

// A loaded local image: the blob URL and the value it was loaded for, so a stale load is ignored after the value
// changes (the old blob URL is revoked on cleanup, so it must never be returned for a different value).
interface LoadedLocal {
    forValue: string
    url: string
}

/**
 * Resolves an image field/markdown value to a renderable `<img src>`: a remote http(s) URL is returned unchanged; a
 * local OPFS path is loaded to a session-scoped `blob:` URL, revoked on value-change/unmount. Returns undefined while
 * loading or when the local image is missing. Re-resolves when its image is (re)written to the OPFS, so an image that
 * arrives after first render — e.g. downloaded during a background cloud sync — appears without a reload.
 */
export function useImageSource(value: string): string | undefined {
    const [loaded, setLoaded] = useState<LoadedLocal | null>(null)
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
            if (!active || !blob) return
            objectUrl = URL.createObjectURL(blob)
            setLoaded({forValue: value, url: objectUrl})
        })()
        return () => {
            active = false
            if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
    }, [value, isLocal, writeToken])

    if (!isLocal) return value === '' ? undefined : value
    // Only return the loaded URL once it matches the current value; otherwise it is loading or stale (being revoked).
    return loaded && loaded.forValue === value ? loaded.url : undefined
}
