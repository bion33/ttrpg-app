import type {FieldDefinition} from '../../../types/FieldDefinition.ts'
import FieldForeignObject from '../FieldForeignObject/FieldForeignObject'
import './CheckboxInput.css'

// The checked mark is drawn as a native SVG shape (a <circle>, or a <polygon>
// diamond/star) in the artwork's own coordinate space (not a CSS fill inside
// the <foreignObject>). Firefox snaps foreignObject content to device pixels
// differently for screen vs. print, so a CSS-drawn dot drifts on the x-axis
// when printed; an SVG circle does not. The <input> functions purely as a
// transparent hit target.

// Points for a regular n-pointed star, first point at the top (12 o'clock),
// alternating between the outer radius and innerRatio * outer radius.
function starPoints(cx: number, cy: number, outer: number, innerRatio = 0.4, n = 5) {
    return Array.from({length: n * 2}, (_, i) => {
        const radius = i % 2 === 0 ? outer : outer * innerRatio
        const angle = -Math.PI / 2 + (i * Math.PI) / n
        return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`
    }).join(' ')
}

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
    // 'black' (and omitted) fall through to the CSS default fill (the artwork ink).
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
