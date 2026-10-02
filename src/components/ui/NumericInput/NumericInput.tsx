import {useState} from 'react'
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

    // Signed fields are edited as text so the value can carry an explicit leading sign (e.g. "+3").
    if (field.signed) {
        return (
            <FieldForeignObject field={field}>
                <SignedNumericInput value={value} onChange={onChange} style={style}/>
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

/**
 * Editable text control for a signed numeric value: shows a leading sign when unfocused, parses the typed number.
 */
function SignedNumericInput({
                                value,
                                onChange,
                                style,
                            }: {
    value: number | null
    onChange: (value: number | null) => void
    style: {fontSize?: number; textAlign: 'left' | 'center' | 'right'}
}) {
    // A live draft while editing, so intermediate input (a lone "+"/"-") is preserved; null hands display back to the model.
    const [draft, setDraft] = useState<string | null>(null)
    const display = draft ?? (value === null ? '' : formatModifier(value))
    return (
        <input
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
