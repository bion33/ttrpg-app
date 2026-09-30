import type {FieldDefinition} from "./FieldDefinition.ts";

/**
 * A number field, adding the display-only signed flag to the base layout.
 */
export type NumericFieldDefinition = FieldDefinition & {
    type: 'number'
    // When true, the value is displayed with an explicit leading sign (e.g. a modifier "+3").
    signed?: boolean
}
