import type {PageType} from '@features/Binder/pageTypes.ts'

/**
 * A reusable markdown note layout, authored once and picked when adding a Notes page. Its body lives separately (under
 * the template content prefix), so this is just the identity and display label.
 */
export interface MarkdownTemplate {
    id: string
    label: string
}

/**
 * One tab in a binder template: its structure only (label, page type, tab hue), plus — for a markdown tab — a reference
 * to the markdown template whose content seeds the created page. No content is stored here.
 */
export interface BinderTemplatePage {
    id: string
    label: string
    type: PageType
    hue: number
    markdownTemplateId?: string
}

/**
 * A reusable binder structure: an ordered list of tab definitions chosen when creating a binder. Structure only — a
 * markdown tab's content comes from its referenced markdown template at creation time, keeping the template live-linked.
 */
export interface BinderTemplate {
    id: string
    label: string
    pages: BinderTemplatePage[]
}
