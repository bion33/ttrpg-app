import type {ImageFieldDefinition} from '@type/ImageFieldDefinition.ts'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'
import ImagePanel from '@ui/ImagePanel/ImagePanel'

/**
 * Props for the image field: its layout definition and its image URL ('' = none) with a setter.
 */
interface ImageFieldProps {
    field: ImageFieldDefinition
    value: string
    onChange: (value: string) => void
}

/**
 * A field that holds a single image. It shows the image when one is set, otherwise an empty drop target, via the shared
 * image panel's "…" menu to add, change, or remove the image.
 */
function ImageField({field, value, onChange}: ImageFieldProps) {
    return (
        <FieldForeignObject field={field}>
            <ImagePanel imageUrl={value} onChangeImage={onChange} shape={field.shape}/>
        </FieldForeignObject>
    )
}

export default ImageField
