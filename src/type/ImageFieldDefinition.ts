import type {FieldDefinition} from "./FieldDefinition.ts";

/**
 * An image field, adding the panel's shape and whether it renders beneath the artwork to the base layout.
 */
export type ImageFieldDefinition = FieldDefinition & {
    type: 'image'
    // Panel shape; 'circle' clips the image to a disc filling the footprint, defaults to 'rectangle'.
    shape?: 'rectangle' | 'circle'
}
