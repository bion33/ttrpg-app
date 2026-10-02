import type {Page} from '@features/Binder/binderAtoms.ts'
import type {BinderTemplate} from '../../templateTypes.ts'

/**
 * A markdown page to seed after instantiation: its created page id and the markdown template whose content to copy in.
 */
export interface MarkdownSeed {
    pageId: string
    markdownTemplateId: string
}

/**
 * The result of instantiating a binder template: the concrete pages to persist (order, label, type, and hue preserved,
 * each with a fresh id that doubles as its storage prefix) and the markdown seeds to copy from referenced templates.
 */
export interface InstantiatedBinder {
    pages: Page[]
    seeds: MarkdownSeed[]
}

/**
 * Turns a binder template's structure into concrete pages plus the markdown seeds to copy, using an injected id factory
 * so the result is deterministic and testable. A markdown tab with a template reference yields a seed; all others do not.
 */
export function instantiateBinderTemplate(template: BinderTemplate, makeId: () => string): InstantiatedBinder {
    const pages: Page[] = []
    const seeds: MarkdownSeed[] = []
    for (const templatePage of template.pages) {
        const id = makeId()
        pages.push({id, label: templatePage.label, type: templatePage.type, storagePrefix: id, hue: templatePage.hue})
        if (templatePage.type === 'markdown' && templatePage.markdownTemplateId) {
            seeds.push({pageId: id, markdownTemplateId: templatePage.markdownTemplateId})
        }
    }
    return {pages, seeds}
}
