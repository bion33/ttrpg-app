import type {createStore} from 'jotai'
import {atomWithStorage} from 'jotai/utils'
import {notifyingStorage} from '@lib/storage/observableStorage.ts'
import {markdownAtom} from '@pages/MarkdownPage/markdownAtoms.ts'
import type {MarkdownTemplate, BinderTemplate} from './templateTypes.ts'

// The jotai store a seeding operation reads from and writes to.
type Store = ReturnType<typeof createStore>

/** The user's markdown note templates, persisted library-wide (so edits feed dirty-detection and the snapshot). */
export const markdownTemplatesAtom = atomWithStorage<MarkdownTemplate[]>(
    'markdownTemplates', [], notifyingStorage<MarkdownTemplate[]>(),
)

/** The user's binder-structure templates, persisted library-wide. */
export const binderTemplatesAtom = atomWithStorage<BinderTemplate[]>(
    'binderTemplates', [], notifyingStorage<BinderTemplate[]>(),
)

/**
 * The storage prefix a markdown template's body persists under, so its content rides the same notes-page markdown atom
 * (keyed `template:<id>:markdown`) and serialises into the whole-library snapshot like any page.
 */
export function templateContentPrefix(id: string): string {
    return `template:${id}`
}

/**
 * Copies a markdown template's current body into a destination page's markdown, so a page created from the template
 * starts with a concrete copy of the template's live content.
 */
export function seedMarkdownContent(store: Store, destinationPrefix: string, markdownTemplateId: string): void {
    const content = store.get(markdownAtom(templateContentPrefix(markdownTemplateId)))
    store.set(markdownAtom(destinationPrefix), content)
}

/**
 * Clears a deleted markdown template's stored body, so its content does not linger in the snapshot after the template
 * is removed.
 */
export function clearMarkdownTemplateContent(store: Store, markdownTemplateId: string): void {
    store.set(markdownAtom(templateContentPrefix(markdownTemplateId)), '')
}
