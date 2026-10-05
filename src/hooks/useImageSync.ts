import {useCallback} from 'react'
import {toast} from 'sonner'
import type {ProviderId, StorageTarget} from '@lib/storage/providers/StorageProvider.ts'
import {getProvider} from '@lib/storage/providers/providers.ts'
import {collectImageRefs} from '@lib/images/collectImageRefs.ts'
import {
    deleteImage,
    IMAGE_STORAGE_UNAVAILABLE_MESSAGE,
    isImageStorageAvailable,
    listImages,
    readImage,
    writeImageBytes,
} from '@lib/images/imageStore.ts'
import {reconcileImages} from '@lib/storage/sync/reconcileImages.ts'
import {errorMessage} from '@lib/errors/errorMessage.ts'

/**
 * The image-folder side of cloud sync, kept out of useStorage so that hook stays focused on the snapshot. After a cloud
 * save it uploads newly-referenced images, deletes images the app no longer references, and GCs orphaned local images;
 * after a cloud load it downloads referenced images not yet local. Failures surface as toasts and never block the
 * snapshot result. A no-op for a provider with no live image folder (the file provider, which bundles images in its
 * export zip instead).
 */
export function useImageSync() {
    // Reconciles the OPFS and the provider's image folder against what the snapshot references, after a successful save:
    // uploads, remote deletions, and local GC.
    const syncAfterSave = useCallback(async (providerId: ProviderId, target: StorageTarget, entries: Record<string, string>) => {
        const provider = getProvider(providerId)
        if (!provider.listImages || !provider.putImage || !provider.deleteImage) return
        try {
            const referenced = collectImageRefs(entries)
            const [local, remote] = await Promise.all([listImages(), provider.listImages(target)])
            const {toUpload, toDeleteRemote, toDeleteLocal} =
                reconcileImages({referenced, local: new Set(local), remote: new Set(remote)})
            for (const path of toUpload) {
                const blob = await readImage(path)
                if (blob) await provider.putImage(target, path, blob)
            }
            for (const path of toDeleteRemote) await provider.deleteImage(target, path)
            for (const path of toDeleteLocal) await deleteImage(path)
        } catch (caught) {
            toast.error(errorMessage(caught, 'Image sync failed.'))
        }
    }, [])

    // Downloads into the OPFS the images the just-loaded snapshot references that are not yet local. It fetches each
    // missing path directly rather than listing the remote first: the snapshot already names every path, so a flaky or
    // empty remote listing can never silently skip a download.
    const syncAfterLoad = useCallback(async (providerId: ProviderId, target: StorageTarget, entries: Record<string, string>) => {
        const provider = getProvider(providerId)
        if (!provider.getImage) return
        try {
            const local = new Set(await listImages())
            const missing = [...collectImageRefs(entries)].filter((path) => !local.has(path))
            if (missing.length === 0) return
            // OPFS is blocked outside a secure context, so downloaded bytes would silently vanish; say so instead.
            if (!(await isImageStorageAvailable())) {
                toast.error(IMAGE_STORAGE_UNAVAILABLE_MESSAGE)
                return
            }
            for (const path of missing) {
                const blob = await provider.getImage(target, path)
                if (blob) await writeImageBytes(path, blob)
            }
        } catch (caught) {
            toast.error(errorMessage(caught, 'Image download failed.'))
        }
    }, [])

    return {syncAfterSave, syncAfterLoad}
}
