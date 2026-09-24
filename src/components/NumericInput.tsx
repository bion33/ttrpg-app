import type {FieldDefinition} from '../types/FieldDefinition.ts'
import FieldForeignObject from './FieldForeignObject'
import './NumericInput.css'

function NumericInput({
                          field,
                          value,
                          onChange,
                      }: {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
}) {
    return (
        <FieldForeignObject field={field}>
            <input
                className="sheet-field"
                type="text"
                inputMode="numeric"
                pattern="[+-]?[0-9]*"
                style={{fontSize: field.fontSize, textAlign: field.textAlign ?? 'center'}}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </FieldForeignObject>
    )
}

export default NumericInput
