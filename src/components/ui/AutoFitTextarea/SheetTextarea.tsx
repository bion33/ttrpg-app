import {useRef} from 'react'
import type {FieldDefinition} from '@type/FieldDefinition.ts'
import {DEFAULT_FONT_SIZE, useAutoFitFontSize} from '@hooks/useAutoFitFontSize.ts'

/**
 * The bare multi-line sheet textarea (no `foreignObject` wrapper), with its font size auto-fitting the value to the
 * field height. Rendered inside a `FieldForeignObject` by AutoFitTextarea, or alongside other content elsewhere.
 */
function SheetTextarea({
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
        <textarea
            ref={textareaReference}
            className="sheet-field sheet-field--multiline"
            style={{fontSize, textAlign: field.textAlign}}
            value={value}
            onChange={(event) => onChange(event.target.value)}
        />
    )
}

export default SheetTextarea
