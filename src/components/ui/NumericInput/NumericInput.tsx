import type {FieldDefinition} from '../../../types/FieldDefinition.ts'
import FieldForeignObject from '../FieldForeignObject/FieldForeignObject'
import './NumericInput.css'

/**
 * Numeric field control, optionally read-only for derived values.
 */
function NumericInput({
                          field,
                          value,
                          onChange,
                          readOnly = false,
                      }: {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
    readOnly?: boolean
}) {
    return (
        <FieldForeignObject field={field}>
            <input
                className="sheet-field"
                type="text"
                inputMode="numeric"
                pattern="[+-]?[0-9]*"
                readOnly={readOnly}
                style={{fontSize: field.fontSize, textAlign: field.textAlign ?? 'center'}}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </FieldForeignObject>
    )
}

export default NumericInput
