import type {FieldDefinition} from "./FieldDefinition.ts";

/**
 * A checkbox field, adding the mark's shape and fill color to the base layout.
 */
export type CheckFieldDefinition = FieldDefinition & {
    type: 'check'
    // Checkbox mark shape; defaults to 'circle' when omitted.
    shape?: 'circle' | 'diamond' | 'star'
    // Checkbox fill color; defaults to 'black' (the artwork ink) when omitted.
    color?: 'black' | 'green' | 'goldenrod' | 'firebrick'
}