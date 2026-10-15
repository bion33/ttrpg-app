import {useRef, useState} from 'react'
import type {RefObject} from 'react'
import type {NumericFieldDefinition} from '@type/NumericFieldDefinition.ts'
import {formatModifier} from '@lib/number/formatModifier.ts'
import {DEFAULT_FONT_SIZE, useAutoFitFontSize} from '@hooks/useAutoFitFontSize.ts'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'
import './NumericInput.css'

type NumericStyle = {fontSize: number; textAlign: 'left' | 'center' | 'right'}

/**
 * Builds the style for a numeric field's input, shrinking the font so the given display text fits the field width.
 */
function useFittedStyle(
    inputReference: RefObject<HTMLInputElement | null>,
    displayText: string,
    field: NumericFieldDefinition,
): NumericStyle {
    const maxFontSize = field.fontSize ?? DEFAULT_FONT_SIZE
    const fontSize = useAutoFitFontSize(inputReference, displayText, maxFontSize, 'width')
    return {fontSize, textAlign: field.textAlign ?? 'center'}
}

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
    // Read-only fields display the value formatted (with a leading sign when signed); blank when null.
    if (readOnly) {
        const display = value === null ? '' : field.signed ? formatModifier(value) : String(value)
        return <ReadOnlyNumericInput field={field} display={display}/>
    }

    // Signed fields are edited as text so the value can carry an explicit leading sign (e.g. "+3").
    if (field.signed) {
        return (
            <FieldForeignObject field={field}>
                <SignedNumericInput field={field} value={value} onChange={onChange}/>
            </FieldForeignObject>
        )
    }

    return (
        <FieldForeignObject field={field}>
            <PlainNumericInput field={field} value={value} onChange={onChange}/>
        </FieldForeignObject>
    )
}

export default NumericInput

/**
 * Read-only display of a numeric value, font-fitted to the field width.
 */
function ReadOnlyNumericInput({field, display}: {field: NumericFieldDefinition; display: string}) {
    const inputReference = useRef<HTMLInputElement>(null)
    const style = useFittedStyle(inputReference, display, field)
    return (
        <FieldForeignObject field={field}>
            <input ref={inputReference} className="sheet-field" type="text" readOnly style={style} value={display}/>
        </FieldForeignObject>
    )
}

/**
 * Editable numeric control, font-fitted to the field width.
 */
function PlainNumericInput({
                               field,
                               value,
                               onChange,
                           }: {
    field: NumericFieldDefinition
    value: number | null
    onChange: (value: number | null) => void
}) {
    const inputReference = useRef<HTMLInputElement>(null)
    const display = value ?? ''
    const style = useFittedStyle(inputReference, String(display), field)
    return (
        <input
            ref={inputReference}
            className="sheet-field"
            type="number"
            style={style}
            value={display}
            onChange={(event) => onChange(event.target.value === '' ? null : event.target.valueAsNumber)}
        />
    )
}

/**
 * Editable text control for a signed numeric value: shows a leading sign when unfocused, parses the typed number.
 */
function SignedNumericInput({
                                field,
                                value,
                                onChange,
                            }: {
    field: NumericFieldDefinition
    value: number | null
    onChange: (value: number | null) => void
}) {
    // A live draft while editing, so intermediate input (a lone "+"/"-") is preserved; null hands display back to the model.
    const [draft, setDraft] = useState<string | null>(null)
    const inputReference = useRef<HTMLInputElement>(null)
    const display = draft ?? (value === null ? '' : formatModifier(value))
    const style = useFittedStyle(inputReference, display, field)
    return (
        <input
            ref={inputReference}
            className="sheet-field"
            type="text"
            inputMode="numeric"
            style={style}
            value={display}
            onChange={(event) => {
                setDraft(event.target.value)
                onChange(parseSignedNumber(event.target.value))
            }}
            onBlur={() => setDraft(null)}
        />
    )
}

/**
 * Parses a user-typed signed number (optional leading sign), returning null for empty or incomplete input.
 */
function parseSignedNumber(raw: string): number | null {
    const trimmed = raw.trim()
    if (trimmed === '') return null
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : null
}
