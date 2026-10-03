import type {FieldDefinition} from '@type/FieldDefinition.ts'
import {parseImageTextareaValue, serializeImageTextareaValue} from '@lib/fields/imageTextareaValue.ts'
import FieldForeignObject from '@ui/FieldForeignObject/FieldForeignObject'
import SheetTextarea from '@ui/AutoFitTextarea/SheetTextarea'
import ImagePanel from '@ui/ImagePanel/ImagePanel'

/**
 * Props for the image-or-textarea field: its layout definition and its encoded value (text plus image URL) with a
 * setter.
 */
interface ImageTextareaFieldProps {
    field: FieldDefinition
    value: string
    onChange: (value: string) => void
}

/**
 * A field that holds either a prose description or a single image. It shows the image when one is set, otherwise an
 * auto-fitting textarea, via the shared image panel. The text and the image URL are encoded together in the field's
 * one value, so switching between them never loses the other.
 */
function ImageTextareaField({field, value, onChange}: ImageTextareaFieldProps) {
    const {text, imageUrl} = parseImageTextareaValue(value)

    return (
        <FieldForeignObject field={field}>
            <ImagePanel
                imageUrl={imageUrl}
                onChangeImage={(url) => onChange(serializeImageTextareaValue({text, imageUrl: url}))}
                fallback={<SheetTextarea field={field} value={text}
                                         onChange={(next) => onChange(serializeImageTextareaValue({
                                             text: next,
                                             imageUrl
                                         }))}/>}
            />
        </FieldForeignObject>
    )
}

export default ImageTextareaField
