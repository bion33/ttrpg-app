import {PluginKey} from '@tiptap/pm/state'

/**
 * Build-time stand-in for `@tiptap/y-tiptap`, aliased in `vite.config.ts`.
 *
 * `@tiptap/extension-drag-handle` statically imports these Yjs collaboration helpers but only reaches them when a
 * y-sync plugin is registered (every call site guards on `ySyncPluginKey.getState(state)` first). This app has no
 * collaboration, so the plugin is never present: this key's state is always undefined and the converters are never
 * called, letting us drop the whole Yjs stack from the bundle.
 */
export const ySyncPluginKey = new PluginKey('y-sync')

/**
 * Unreachable without collaboration (see the note above); present only to satisfy the drag handle's static import.
 */
export function absolutePositionToRelativePosition(): null {
    return null
}

/**
 * Unreachable without collaboration (see the note above); present only to satisfy the drag handle's static import.
 */
export function relativePositionToAbsolutePosition(): null {
    return null
}
