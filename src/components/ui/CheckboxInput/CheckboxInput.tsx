import type {FieldDefinition} from '../../../types/FieldDefinition.ts'
import FieldForeignObject from '../FieldForeignObject/FieldForeignObject'
import './CheckboxInput.css'

/**
 * The checked mark is drawn as a native SVG shape (circle, diamond, or star) in
 * the artwork's coordinate space; the <input> is a transparent hit target. An
 * SVG shape, unlike a CSS fill in the <foreignObject>, stays put when printed.
 */

/**
 * Points for a regular n-pointed star, first point at the top (12 o'clock).
 */
function starPoints(cx: number, cy: number, outer: number, innerRatio = 0.4, n = 5) {
    return Array.from({length: n * 2}, (_, i) => {
        const radius = i % 2 === 0 ? outer : outer * innerRatio
        const angle = -Math.PI / 2 + (i * Math.PI) / n
        return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
    }).join(' ')
}

/**
 * Checkbox field control; renders the checked mark as an SVG shape.
 */
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

    const cx = field.x + field.width / 2
    const cy = field.y + field.height / 2
    const r = Math.min(field.width, field.height) * 0.32
    // Non-default colors override the CSS fill.
    const fillStyle = field.color && field.color !== 'black' ? {fill: field.color} : undefined

    return (
        <>
            {checked &&
                (field.shape === 'diamond' ? (
                    <polygon
                        className="sheet-checkbox-fill"
                        style={fillStyle}
                        points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                    />
                ) : field.shape === 'star' ? (
                    <polygon
                        className="sheet-checkbox-fill"
                        style={fillStyle}
                        points={starPoints(cx, cy, r * 1.55)}
                    />
                ) : (
                    <circle className="sheet-checkbox-fill" style={fillStyle} cx={cx} cy={cy} r={r}/>
                ))}
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
