import { useLayoutEffect, useRef, useState } from 'react'
import type { FieldDefinition } from '../types/FieldDefinition.ts'
import FieldForeignObject from './FieldForeignObject'

const DEFAULT_FONT_SIZE = 9
const MIN_FONT_SIZE = 6

// Shrinks the input's font size (from its configured/max size) just enough
// that the text stops overflowing the field, and grows it back toward that
// max as room frees up (e.g. after deleting characters).
function AutoFitInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition
  value: string
  onChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const maxFontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const [fontSize, setFontSize] = useState(maxFontSize)

  useLayoutEffect(() => {
    const el = inputRef.current
    if (!el) return

    let size = maxFontSize
    el.style.fontSize = `${size}px`
    while (size > MIN_FONT_SIZE && el.scrollWidth > el.clientWidth) {
      size -= 1
      el.style.fontSize = `${size}px`
    }
    setFontSize(size)
  }, [value, maxFontSize])

  return (
    <FieldForeignObject field={field}>
      <input
        ref={inputRef}
        className="sheet-field"
        type={field.type}
        style={{ fontSize, textAlign: field.textAlign }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldForeignObject>
  )
}

export default AutoFitInput
