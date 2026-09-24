import { useLayoutEffect, useRef, useState } from 'react'
import type { FieldDefinition } from '../types/FieldDefinition.ts'
import FieldForeignObject from './FieldForeignObject'
import './AutoFitTextarea.css'

const DEFAULT_FONT_SIZE = 9
const MIN_FONT_SIZE = 6

// Multi-line variant of AutoFitInput: shrinks the font size (from its
// configured/max size) just enough that the text stops overflowing the field
// vertically, and grows it back toward that max as room frees up.
function AutoFitTextarea({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition
  value: string
  onChange: (value: string) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const maxFontSize = field.fontSize ?? DEFAULT_FONT_SIZE
  const [fontSize, setFontSize] = useState(maxFontSize)

  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return

    let size = maxFontSize
    el.style.fontSize = `${size}px`
    while (size > MIN_FONT_SIZE && el.scrollHeight > el.clientHeight) {
      size -= 1
      el.style.fontSize = `${size}px`
    }
    setFontSize(size)
  }, [value, maxFontSize])

  return (
    <FieldForeignObject field={field}>
      <textarea
        ref={textareaRef}
        className="sheet-field sheet-field--multiline"
        style={{ fontSize, textAlign: field.textAlign }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldForeignObject>
  )
}

export default AutoFitTextarea
