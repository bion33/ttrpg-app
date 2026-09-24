import type { FieldDefinition } from '../types/FieldDefinition.ts'
import FieldForeignObject from './FieldForeignObject'
import './CheckboxInput.css'

// The checked mark is drawn as a native SVG <circle> in the artwork's own
// coordinate space (not a CSS fill inside the <foreignObject>). Firefox snaps
// foreignObject content to device pixels differently for screen vs. print, so
// a CSS-drawn dot drifts on the x-axis when printed; an SVG circle does not.
// The <input> stays purely as a transparent hit target.
function CheckboxInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition
  value: string
  onChange: (value: string) => void
}) {
  const checked = value === 'true'

  return (
    <>
      {checked && (
        <circle
          className="sheet-checkbox-fill"
          cx={field.x + field.width / 2}
          cy={field.y + field.height / 2}
          r={Math.min(field.width, field.height) * 0.32}
        />
      )}
      <FieldForeignObject field={field}>
        <input
          className="sheet-checkbox"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? 'true' : 'false')}
        />
      </FieldForeignObject>
    </>
  )
}

export default CheckboxInput
