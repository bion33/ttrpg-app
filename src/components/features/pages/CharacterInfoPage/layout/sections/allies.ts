import type {InfoSheetFactory} from '@pages/CharacterInfoPage/layout/nodes.ts'

/**
 * Builds the character-info allies fields: the allies & organisations area and the deity subsection (its name band and
 * the info area under the deity decoration). All coordinates are in the artwork's viewBox units (see FieldDefinition).
 */
export function buildAllies({inputNode}: InfoSheetFactory) {
    return {
        alliesAndOrganisations: inputNode({id: 'alliesAndOrganisations', x: 293, y: 173, width: 236, height: 286, type: 'textarea', fontSize: 12}),

        deity: {
            deityName: inputNode({id: 'deityName', x: 576, y: 360, width: 160, height: 20, type: 'text', fontSize: 16, textAlign: 'center'}),
            deityInfo: inputNode({id: 'deityInfo', x: 543, y: 412, width: 232, height: 52, type: 'textarea', fontSize: 12}),
        },
    }
}
