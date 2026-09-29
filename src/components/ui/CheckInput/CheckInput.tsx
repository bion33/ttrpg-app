import FieldForeignObject from '../FieldForeignObject/FieldForeignObject'
import './CheckInput.css'
import type {CheckFieldDefinition} from "../../../types/CheckFieldDefinition.ts";

/**
 * The checked mark is drawn as a native SVG shape (circle, diamond, or star) in
 * the artwork's coordinate space; the <input> is a transparent hit target. An
 * SVG shape, unlike a CSS fill in the <foreignObject>, stays put when printed.
 */

/**
 * Points for a regular n-pointed star, first point at the top (12 o'clock).
 */
function starPoints(centerX: number, centerY: number, outer: number, innerRatio = 0.4, points = 5) {
    return Array.from({length: points * 2}, (_, index) => {
        const radius = index % 2 === 0 ? outer : outer * innerRatio
        const angle = -Math.PI / 2 + (index * Math.PI) / points
        return `${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`
    }).join(' ')
}

/**
 * Checkbox field control; renders the checked mark as an SVG shape.
 */
function CheckInput({
                        field,
                        value,
                        onChange,
                    }: {
    field: CheckFieldDefinition
    value: boolean
    onChange: (value: boolean) => void
}) {
    const checked = value

    const centerX = field.x + field.width / 2
    const centerY = field.y + field.height / 2
    const radius = Math.min(field.width, field.height) * 0.32
    // Non-default colors override the CSS fill.
    const fillStyle = field.color && field.color !== 'black' ? {fill: field.color} : undefined

    return (
        <>
            {checked &&
                (field.shape === 'diamond' ? (
                    <polygon
                        className="sheet-checkbox-fill"
                        style={fillStyle}
                        points={`${centerX},${centerY - radius} ${centerX + radius},${centerY} ${centerX},${centerY + radius} ${centerX - radius},${centerY}`}
                    />
                ) : field.shape === 'star' ? (
                    <polygon
                        className="sheet-checkbox-fill"
                        style={fillStyle}
                        points={starPoints(centerX, centerY, radius * 1.55)}
                    />
                ) : (
                    <circle className="sheet-checkbox-fill" style={fillStyle} cx={centerX} cy={centerY} r={radius}/>
                ))}
            <FieldForeignObject field={field}>
                <input
                    className="sheet-checkbox"
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => onChange(event.target.checked)}
                />
            </FieldForeignObject>
        </>
    )
}

export default CheckInput
