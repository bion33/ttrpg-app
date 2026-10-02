import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'

/**
 * Builds the character-info allies fields: the allies & organisations area and the deity subsection (its name band and
 * the info area under the deity decoration). All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildAllies({inputNode}: InfoSheetFactory) {
    return {
        alliesAndOrganisations: inputNode({id: 'alliesAndOrganisations', x: 296, y: 180, width: 234, height: 290, type: 'textarea', fontSize: 12}),

        deity: {
            deityName: inputNode({id: 'deityName', x: 586, y: 360, width: 140, height: 20, type: 'text', fontSize: 16, textAlign: 'center'}),
            deityInfo: inputNode({id: 'deityInfo', x: 537, y: 408, width: 235, height: 62, type: 'textarea', fontSize: 12}),
        },
    }
}
