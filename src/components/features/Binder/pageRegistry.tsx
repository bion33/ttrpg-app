import type {ReactNode} from 'react'
import type {PageType} from './pageTypes.ts'
import {A4_WIDTH_PX} from '@lib/paper/paperSize.ts'
import CharacterPage from '@pages/CharacterPage/CharacterPage'
import CharacterInfoPage from '@pages/CharacterInfoPage/CharacterInfoPage'
import EquipmentPage from '@pages/EquipmentPage/EquipmentPage'
import MarkdownPage from '@pages/MarkdownPage/MarkdownPage'
import EmptyPage from '@pages/EmptyPage/EmptyPage'

/**
 * How one page type is rendered and sized: its natural (unscaled) on-screen width for the zoom, and a render function
 * bound to the page's resolved storage prefix, whether it is the shown page, and its tab label.
 */
interface PageTypeEntry {
    naturalWidth: number

    render(prefix: string, active: boolean, label: string): ReactNode
}

/**
 * The single registry of page types: keyed by `PageType` (a `Record`, so adding a type is a compile error until it is
 * registered here), it is the one place both page rendering and page-width resolution are defined, so they never drift.
 */
export const PAGE_REGISTRY: Record<PageType, PageTypeEntry> = {
    characterSheet: {
        naturalWidth: CharacterPage.naturalWidth,
        render: (prefix) => <CharacterPage storagePrefix={prefix}/>,
    },
    characterInfo: {
        naturalWidth: CharacterInfoPage.naturalWidth,
        render: (prefix) => <CharacterInfoPage storagePrefix={prefix}/>,
    },
    equipment: {
        naturalWidth: EquipmentPage.naturalWidth,
        render: (prefix) => <EquipmentPage storagePrefix={prefix}/>,
    },
    markdown: {
        naturalWidth: MarkdownPage.naturalWidth,
        render: (prefix, active) => <MarkdownPage storagePrefix={prefix} active={active}/>,
    },
    // The empty stand-in takes no prefix; it uses PaperPage, itself a physical A4 sheet.
    empty: {
        naturalWidth: A4_WIDTH_PX,
        render: (_prefix, _active, label) => <EmptyPage title={label}/>,
    },
}
