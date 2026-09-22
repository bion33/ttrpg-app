import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import './CharacterSheet.css'

const SVG_URL = '/character-sheet/character-sheet.svg'
const VIEW_BOX = '0 0 816 1055.867'
const DEFAULT_FONT_SIZE = 9
const MIN_FONT_SIZE = 6

// Overlay field positions, in the *same* coordinate space as the artwork's
// viewBox (not pixels). Because both the <image>/<path> artwork and these
// <foreignObject> inputs live inside one <svg viewBox="...">, the browser
// scales them together - no separate resize-tracking logic needed.
type FieldDef = {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: 'text' | 'number'
  fontSize?: number
  textAlign?: 'left' | 'center' | 'right'
}

const FIELDS: FieldDef[] = [
  { id: 'characterName', x: 88, y: 82, width: 230, height: 28, type: 'text', fontSize: 24, textAlign: 'center' },
  { id: 'classAndLevel', x: 359.6, y: 64, width: 142, height: 22, type: 'text', fontSize: 18 },
  { id: 'background', x: 510, y: 64, width: 122, height: 22, type: 'text', fontSize: 18 },
  { id: 'playerName', x: 639, y: 64, width: 155, height: 22, type: 'text', fontSize: 18 },
  { id: 'raceAndSize', x: 359.6, y: 98, width: 142, height: 22, type: 'text', fontSize: 18 },
  { id: 'alignment', x: 510, y: 98, width: 122, height: 22, type: 'text', fontSize: 18 },
  { id: 'experiencePoints', x: 639.1, y: 98, width: 155, height: 22, type: 'text', fontSize: 18 },
  { id: 'currentHitPoints', x: 350, y: 292, width: 110, height: 36, type: 'number', fontSize: 32, textAlign: 'center' },
]

// Shrinks the input's font size (from its configured/max size) just enough
// that the text stops overflowing the field, and grows it back toward that
// max as room frees up (e.g. after deleting characters).
function AutoFitInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef
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
    <input
      ref={inputRef}
      className="sheet-field"
      type={field.type}
      style={{ fontSize, textAlign: field.textAlign }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function CharacterSheet() {
  const [artworkMarkup, setArtworkMarkup] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch(SVG_URL)
      .then((res) => res.text())
      .then((text) => {
        const match = text.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
        setArtworkMarkup(match ? match[1] : text)
      })
  }, [])

  const setValue = (id: string, value: string) =>
    setValues((prev) => ({ ...prev, [id]: value }))

  if (!artworkMarkup) return <p>Loading character sheet…</p>

return (
    <svg
      ref={svgRef}
      className="character-sheet"
      viewBox={VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
    >
      <g dangerouslySetInnerHTML={{ __html: artworkMarkup }} />
      {FIELDS.map((field) => (
        <foreignObject
          key={field.id}
          x={field.x}
          y={field.y}
          width={field.width}
          height={field.height}
        >
          {field.type === 'text' ? (
            <AutoFitInput
              field={field}
              value={values[field.id] ?? ''}
              onChange={(value) => setValue(field.id, value)}
            />
          ) : (
            <input
              className="sheet-field"
              type={field.type}
              style={{ fontSize: field.fontSize, textAlign: field.textAlign }}
              value={values[field.id] ?? ''}
              onChange={(e) => setValue(field.id, e.target.value)}
            />
          )}
        </foreignObject>
      ))}
    </svg>
  )
}

export default CharacterSheet
