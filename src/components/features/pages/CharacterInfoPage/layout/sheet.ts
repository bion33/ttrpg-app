import {collectNodes} from '@lib/fields/fieldNodes.ts'
import type {FieldNode} from '@type/FieldNode.ts'
import {createInfoSheetFactory} from './nodes.ts'
import {buildAllies} from './sections/allies.ts'
import {buildAppearance} from './sections/appearance.ts'
import {buildCompanion} from './sections/companion.ts'
import {buildHeader} from './sections/header.ts'
import {buildInfo} from './sections/info.ts'

/**
 * One assembled character-info sheet: the flat render list of its field nodes.
 */
export interface InfoSheet {
    fields: FieldNode[]
}

/**
 * Builds one character-info sheet's fields under the given storage-key prefix.
 *
 * All coordinates are in the artwork's viewBox units (see FieldDefinition). Every field is created exactly once (in its
 * section builder) and gathered into a structured tree, which `collectNodes` flattens into the flat `fields` render
 * list. Call once per sheet instance (memoized per prefix in the component).
 */
export function buildInfoSheet(storagePrefix: string): InfoSheet {
    const factory = createInfoSheetFactory(storagePrefix)
    const header = buildHeader(factory)
    const appearance = buildAppearance(factory)
    const allies = buildAllies(factory)
    const info = buildInfo(factory)
    const companion = buildCompanion(factory)

    const tree = {
        header,
        appearance,
        allies,
        info,
        companion,
    }

    return {fields: collectNodes(tree)}
}
