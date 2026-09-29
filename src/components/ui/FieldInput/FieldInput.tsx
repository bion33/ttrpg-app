import {atom, useAtom, useAtomValue} from 'jotai'
import type {FieldDefinition} from '../../../types/FieldDefinition.ts'
import type {FieldNode} from '../../../types/FieldNode.ts'
import AutoFitInput from '../AutoFitInput/AutoFitInput'
import CheckInput from '../CheckInput/CheckInput'
import NumericInput from '../NumericInput/NumericInput'
import './FieldInput.css'
import AutoFitTextarea from '../AutoFitTextarea/AutoFitTextarea'
import type {CheckFieldDefinition} from "../../../types/CheckFieldDefinition.ts";

// ---- INTERNAL CONSTANTS ----

/**
 * Fallback read-only flag for writable fields that declare no `readOnlyAtom`.
 */
const alwaysWritable = atom(false)

/**
 * No-op onChange for read-only derived fields.
 */
const noop = () => {
}

// ---- EXPORTED FUNCTIONS ----

/**
 * Renders a field node, dispatching to the writable or derived variant.
 */
function FieldInput({node}: { node: FieldNode }) {
    return node.readOnly ? <DerivedField node={node}/> : <WritableField node={node}/>
}

export default FieldInput

// ---- INTERNAL FUNCTIONS ----

/**
 * Editable field: two-way bound to its writable atom.
 */
function WritableField({node}: { node: Extract<FieldNode, { readOnly?: false }> }) {
    const [value, setValue] = useAtom(node.atom)
    const readOnly = useAtomValue(node.readOnlyAtom ?? alwaysWritable)
    return control(node.definition, value, setValue, readOnly)
}

/**
 * Computed field: read-only, subscribes to its derived atom.
 */
function DerivedField({node}: { node: Extract<FieldNode, { readOnly: true }> }) {
    const value = useAtomValue(node.atom)
    return control(node.definition, value, noop, true)
}

/**
 * Renders the right control for a field's type. Persistence and cross-field
 * state live in the node's atom, not here.
 */
function control(
    field: FieldDefinition,
    value: string,
    onChange: (value: string) => void,
    readOnly: boolean,
) {
    switch (field.type) {
        case 'number':
            return <NumericInput field={field} value={value} onChange={onChange} readOnly={readOnly}/>
        case 'text':
            return <AutoFitInput field={field} value={value} onChange={onChange}/>
        case 'textarea':
            return <AutoFitTextarea field={field} value={value} onChange={onChange}/>
        case 'check':
            return <CheckInput field={field as CheckFieldDefinition} value={value} onChange={onChange}/>
    }
}

