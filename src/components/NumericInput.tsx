import type { FieldDef } from './types'

function NumericInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string
  onChange: (value: string) => void
}) {
  return (
    <input
      className="sheet-field"
      type="text"
      inputMode="numeric"
      pattern="[+-]?[0-9]*"
      style={{ fontSize: field.fontSize, textAlign: field.textAlign }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export default NumericInput
