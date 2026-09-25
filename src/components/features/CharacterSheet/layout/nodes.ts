import {createFieldFactory, derivedNode} from '../../../../lib/fieldNodes.ts'

/**
 * The single shared factory instance for the character sheet. Every input field
 * on the sheet is built through this `inputNode`, so they all share the
 * 'characterSheet' storage prefix - do NOT create another factory elsewhere, or
 * fields would diverge onto different localStorage key namespaces.
 */
export const {inputNode} = createFieldFactory('characterSheet')
export {derivedNode}
