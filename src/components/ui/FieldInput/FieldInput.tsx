import type {WritableAtom} from 'jotai'
import {atom, useAtom, useAtomValue} from 'jotai'
import type {FieldDefinition} from '@type/FieldDefinition.ts'
import type {FieldNode, FieldValue} from '@type/FieldNode.ts'
import type {NumericFieldDefinition} from '@type/NumericFieldDefinition.ts'
import type {ImageFieldDefinition} from '@type/ImageFieldDefinition.ts'
import AutoFitInput from '@ui/AutoFitInput/AutoFitInput'
import CheckInput from '@ui/CheckInput/CheckInput'
import NumericInput from '@ui/NumericInput/NumericInput'
import './FieldInput.css'
import AutoFitTextarea from '@ui/AutoFitTextarea/AutoFitTextarea'
import ImageTextareaField from '@ui/ImageTextareaField/ImageTextareaField'
import ImageField from '@ui/ImageField/ImageField'
import type {CheckFieldDefinition} from "@type/CheckFieldDefinition.ts";

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
    // The atom is a union of concrete writable atoms; widen it to the common value type for the shared control.
    const [value, setValue] = useAtom(node.atom as unknown as WritableAtom<FieldValue, [FieldValue], void>)
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
    value: FieldValue,
    onChange: (value: FieldValue) => void,
    readOnly: boolean,
) {
    switch (field.type) {
        case 'number':
            return <NumericInput field={field as NumericFieldDefinition} value={value as number | null}
                                 onChange={onChange} readOnly={readOnly}/>
        case 'text':
            return <AutoFitInput field={field} value={value as string} onChange={onChange}/>
        case 'textarea':
            return <AutoFitTextarea field={field} value={value as string} onChange={onChange}/>
        case 'check':
            return <CheckInput field={field as CheckFieldDefinition} value={value as boolean} onChange={onChange}/>
        case 'image':
            return <ImageField field={field as ImageFieldDefinition} value={value as string} onChange={onChange}/>
        case 'imageTextarea':
            return <ImageTextareaField field={field} value={value as string} onChange={onChange}/>
        default:
            // Exhaustiveness guard: a new field type must add a case above.
            return assertNever(field.type)
    }
}

/**
 * Asserts a branch is unreachable, so an unhandled field type is a compile error rather than a silent empty render.
 */
function assertNever(type: never): never {
    throw new Error(`Unhandled field type: ${String(type)}`)
}

