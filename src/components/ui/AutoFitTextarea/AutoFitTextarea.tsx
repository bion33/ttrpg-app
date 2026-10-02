import type {FieldDefinition} from '@type/FieldDefinition.ts'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'
import SheetTextarea from './SheetTextarea.tsx'

/**
 * Multi-line variant of AutoFitInput: an auto-fitting textarea positioned in the artwork's SVG coordinate space.
 */
function AutoFitTextarea({
                             field,
                             value,
                             onChange,
                         }: {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
}) {
    return (
        <FieldForeignObject field={field}>
            <SheetTextarea field={field} value={value} onChange={onChange}/>
        </FieldForeignObject>
    )
}

export default AutoFitTextarea
