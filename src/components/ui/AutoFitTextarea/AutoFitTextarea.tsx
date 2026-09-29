import {useRef} from 'react'
import type {FieldDefinition} from '../../../types/FieldDefinition.ts'
import {DEFAULT_FONT_SIZE, useAutoFitFontSize} from '../../../hooks/useAutoFitFontSize.ts'
import FieldForeignObject from '../FieldForeignObject/FieldForeignObject'
import './AutoFitTextarea.css'

/**
 * Multi-line variant of AutoFitInput: font size auto-fits the value to the field height.
 */
function AutoFitTextarea({
                             field,
                             value,
                             onChange,
                         }: {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
}) {
    const textareaReference = useRef<HTMLTextAreaElement>(null)
    const maxFontSize = field.fontSize ?? DEFAULT_FONT_SIZE
    const fontSize = useAutoFitFontSize(textareaReference, value, maxFontSize, 'height')

    return (
        <FieldForeignObject field={field}>
      <textarea
          ref={textareaReference}
          className="sheet-field sheet-field--multiline"
          style={{fontSize, textAlign: field.textAlign}}
          value={value}
          onChange={(event) => onChange(event.target.value)}
      />
        </FieldForeignObject>
    )
}

export default AutoFitTextarea
