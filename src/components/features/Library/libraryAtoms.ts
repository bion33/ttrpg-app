import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'

/**
 * A binder in the library: a frozen slug id (also the storage-prefix root every one of its pages persists under), a
 * display label, and the hue of its spine on the shelf. Its cover portrait lives in its own per-binder atom.
 */
export interface LibraryBinderItem {
    id: string
    label: string
    hue: number
}

/** The user's binders, loaded from and persisted to storage. Empty until the user adds one. */
export const bindersAtom = atomWithStorage<LibraryBinderItem[]>('binders', [], notifyingStorage<LibraryBinderItem[]>())
