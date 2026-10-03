import type {SheetFactory} from '@lib/fields/fieldNodes.ts'

// The deity portrait field's id, shared so a page can anchor overlay decoration to it without a drifting string literal.
export const DEITY_PORTRAIT_FIELD_ID = 'deityPortrait'

/**
 * Builds the character-info allies fields: the allies & organisations area and the deity subsection (a circular portrait
 * image in the deity medallion, its name band, and the info area). All coordinates are in the artwork's viewBox units
 * (see FieldDefinition).
 */
export function buildAllies({inputNode}: SheetFactory) {
    return {
        alliesAndOrganisations: inputNode({
            id: 'alliesAndOrganisations',
            x: 296,
            y: 180,
            width: 234,
            height: 290,
            type: 'textarea',
            fontSize: 12
        }),

        deity: {
            deityPortrait: inputNode({
                id: DEITY_PORTRAIT_FIELD_ID,
                x: 567,
                y: 202,
                width: 178,
                height: 178,
                type: 'image',
                shape: 'circle'
            }),
            deityName: inputNode({
                id: 'deityName',
                x: 586,
                y: 360,
                width: 140,
                height: 20,
                type: 'text',
                fontSize: 16,
                textAlign: 'center'
            }),
            deityInfo: inputNode({
                id: 'deityInfo',
                x: 537,
                y: 408,
                width: 235,
                height: 62,
                type: 'textarea',
                fontSize: 12
            }),
        },
    }
}
