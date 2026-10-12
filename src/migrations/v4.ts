import type {Migration} from './migrations.ts'
import {isGuid} from '@lib/ids/newId.ts'
import {uniqueSlug} from '@lib/navigation/slug.ts'

// v4 converts the GUID ids of binders, pages, and markdown templates into frozen human-readable slugs, rewriting both
// the storage keys those ids form the prefix of and the ids stored inside the binder/page/template lists. Runs in both
// phases (live local data and incoming GUID-era snapshots) so every path converges on the slug shape. Self-contained
// and frozen: it parses minimal local shapes rather than importing the live types, which may drift after this ships.

// A binder in the stored `binders` list.
interface StoredBinder {
    id: string
    label: string
}

// A page in a binder's stored `:pages` list (only the fields this migration rewrites).
interface StoredPage {
    id: string
    label: string
    storagePrefix: string
}

// A markdown template in the stored `markdownTemplates` list.
interface StoredTemplate {
    id: string
    label: string
}

// A binder template's page, whose markdown-template reference is remapped even though its own id stays a GUID.
interface StoredBinderTemplatePage {
    markdownTemplateId?: string
}

// Parses a stored JSON array, returning [] for anything missing or malformed so a broken entry never aborts the run.
function parseArray<T>(value: string | undefined): T[] {
    if (value === undefined) return []
    try {
        const parsed = JSON.parse(value)
        return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
        return []
    }
}

// Assigns a frozen slug to each GUID-ided item in a sibling set (scoped by the caller), mapping already-slugged ids to
// themselves so a re-run is a no-op; the slug of each is disambiguated against all the others.
function buildSlugMap(items: {id: string; label: string}[], fallback: string): Map<string, string> {
    const used = new Set(items.filter((item) => !isGuid(item.id)).map((item) => item.id))
    const map = new Map<string, string>()
    for (const item of items) {
        if (!isGuid(item.id)) {
            map.set(item.id, item.id)
            continue
        }
        const slug = uniqueSlug(item.label, [...used], fallback)
        used.add(slug)
        map.set(item.id, slug)
    }
    return map
}

// Rewrites a storage key's GUID path segments to their slugs: `template:<guid>:…`, `<binderGuid>:…`, and
// `<binderGuid>:<pageGuid>…` (field, markdown, portrait, pages, activePage keys all included). The page segment may
// carry a dot-joined suffix — a field atom's key is `<binderGuid>:<pageGuid>.field.<id>` — so only its leading id (up
// to the first `.`) is remapped and the suffix is preserved. Unknown segments pass through, so non-id segments like
// `pages`/`portrait` are left intact.
function rewriteKey(key: string, binders: Map<string, string>, pages: Map<string, Map<string, string>>, templates: Map<string, string>): string {
    const segments = key.split(':')
    if (segments[0] === 'template' && segments.length >= 2) {
        segments[1] = templates.get(segments[1]) ?? segments[1]
        return segments.join(':')
    }
    const binderSlug = binders.get(segments[0])
    if (binderSlug === undefined) return key
    const pageMap = pages.get(segments[0])
    segments[0] = binderSlug
    if (pageMap && segments.length >= 2) {
        const dotIndex = segments[1].indexOf('.')
        const pageId = dotIndex === -1 ? segments[1] : segments[1].slice(0, dotIndex)
        const suffix = dotIndex === -1 ? '' : segments[1].slice(dotIndex)
        segments[1] = (pageMap.get(pageId) ?? pageId) + suffix
    }
    return segments.join(':')
}

// Rewrites the ids stored inside the four list/value entries; all other values pass through unchanged.
function rewriteValue(
    key: string,
    value: string,
    binders: Map<string, string>,
    pages: Map<string, Map<string, string>>,
    templates: Map<string, string>,
): string {
    if (key === 'binders') {
        const list = parseArray<StoredBinder>(value)
        return JSON.stringify(list.map((binder) => ({...binder, id: binders.get(binder.id) ?? binder.id})))
    }
    if (key === 'markdownTemplates') {
        const list = parseArray<StoredTemplate>(value)
        return JSON.stringify(list.map((template) => ({...template, id: templates.get(template.id) ?? template.id})))
    }
    if (key === 'binderTemplates') {
        const list = parseArray<{pages?: StoredBinderTemplatePage[]}>(value)
        return JSON.stringify(list.map((template) => ({
            ...template,
            pages: (template.pages ?? []).map((templatePage) => (
                templatePage.markdownTemplateId
                    ? {...templatePage, markdownTemplateId: templates.get(templatePage.markdownTemplateId) ?? templatePage.markdownTemplateId}
                    : templatePage
            )),
        })))
    }
    const segments = key.split(':')
    const pageMap = pages.get(segments[0])
    if (pageMap && segments[1] === 'pages') {
        const list = parseArray<StoredPage>(value)
        return JSON.stringify(list.map((page) => {
            const slug = pageMap.get(page.id) ?? page.id
            return {...page, id: slug, storagePrefix: slug}
        }))
    }
    if (pageMap && segments[1] === 'activePage') {
        return pageMap.get(value) ?? value
    }
    return value
}

/**
 * v4: freezes human-readable slug ids over the legacy GUIDs for binders, pages, and markdown templates — rewriting the
 * storage keys and the ids stored in the binder/page/template lists, remapping binder-template references, and dropping
 * the orphaned `location` key left by the removed location atom.
 */
export const v4: Migration = {
    to: 4,
    phase: 'both',
    migrate: (entries) => {
        const binders = parseArray<StoredBinder>(entries['binders'])
        const binderMap = buildSlugMap(binders, 'binder')
        // One page-id→slug map per binder, scoped to that binder (identical tab names across binders keep one slug).
        const pageMaps = new Map<string, Map<string, string>>()
        for (const binder of binders) {
            const pages = parseArray<StoredPage>(entries[`${binder.id}:pages`])
            pageMaps.set(binder.id, buildSlugMap(pages, 'page'))
        }
        const templateMap = buildSlugMap(parseArray<StoredTemplate>(entries['markdownTemplates']), 'template')

        const migrated: Record<string, string> = {}
        for (const [key, value] of Object.entries(entries)) {
            if (key === 'location') continue
            migrated[rewriteKey(key, binderMap, pageMaps, templateMap)] =
                rewriteValue(key, value, binderMap, pageMaps, templateMap)
        }
        return migrated
    },
}
