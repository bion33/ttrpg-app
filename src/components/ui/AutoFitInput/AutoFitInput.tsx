import {useRef} from 'react'
import type {FieldDefinition} from '@type/FieldDefinition.ts'
import {DEFAULT_FONT_SIZE, useAutoFitFontSize} from '@hooks/useAutoFitFontSize.ts'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'

/**
 * Text input whose font size auto-fits its value to the field width.
 */
function AutoFitInput({
                          field,
                          value,
                          onChange,
                      }: {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
}) {
    const inputReference = useRef<HTMLInputElement>(null)
    const maxFontSize = field.fontSize ?? DEFAULT_FONT_SIZE
    const fontSize = useAutoFitFontSize(inputReference, value, maxFontSize, 'width')

    return (
        <FieldForeignObject field={field}>
            <input
                ref={inputReference}
                className="sheet-field"
                type={field.type}
                style={{fontSize, textAlign: field.textAlign}}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </FieldForeignObject>
    )
}

export default AutoFitInput
