import type {ReactNode} from 'react'
import type {FieldDefinition} from '@type/FieldDefinition.ts'

/**
 * Positions HTML form controls in the artwork's SVG coordinate space.
 */
function FieldForeignObject({field, children}: { field: FieldDefinition; children: ReactNode }) {
    return (
        <foreignObject x={field.x} y={field.y} width={field.width} height={field.height}>
            {children}
        </foreignObject>
    )
}

export default FieldForeignObject
