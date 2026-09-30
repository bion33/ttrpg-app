/**
 * Build-time stand-in for `@tiptap/extension-collaboration`, aliased in `vite.config.ts`.
 *
 * `@tiptap/extension-drag-handle` statically imports `isChangeOrigin` but only calls it to ignore transactions coming
 * from a remote Yjs sync. This app has no collaboration, so this shim always reports "not a remote change", which lets
 * us keep the drag handle without bundling the entire Yjs stack.
 */
export function isChangeOrigin(): boolean {
    return false
}
