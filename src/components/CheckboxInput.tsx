import type {FieldDefinition} from '../types/FieldDefinition.ts'

function CheckboxInput({value, onChange}: {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
}) {
    return (
        <input
            className="sheet-checkbox"
            type="checkbox"
            checked={value === 'true'}
            onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        />
    )
}

export default CheckboxInput
