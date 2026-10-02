import type {NumericFieldDefinition} from '@type/NumericFieldDefinition.ts'
import {formatModifier} from '@pages/CharacterPage/logic/formulas/formulas.ts'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'
import './NumericInput.css'

/**
 * Numeric field control, optionally read-only for derived values. Empty is `null`.
 */
function NumericInput({
                          field,
                          value,
                          onChange,
                          readOnly = false,
                      }: {
    field: NumericFieldDefinition
    value: number | null
    onChange: (value: number | null) => void
    readOnly?: boolean
}) {
    const style = {fontSize: field.fontSize, textAlign: field.textAlign ?? 'center'} as const

    // Read-only fields display the value formatted (with a leading sign when signed); blank when null.
    if (readOnly) {
        const display = value === null ? '' : field.signed ? formatModifier(value) : value
        return (
            <FieldForeignObject field={field}>
                <input className="sheet-field" type="text" readOnly style={style} value={display}/>
            </FieldForeignObject>
        )
    }

    return (
        <FieldForeignObject field={field}>
            <input
                className="sheet-field"
                type="number"
                style={style}
                value={value ?? ''}
                onChange={(event) => onChange(event.target.value === '' ? null : event.target.valueAsNumber)}
            />
        </FieldForeignObject>
    )
}

export default NumericInput
