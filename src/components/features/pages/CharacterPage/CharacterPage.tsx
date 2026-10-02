import {useMemo} from 'react'
import TracedSheetPage, {TRACED_SHEET_NATURAL_WIDTH} from '@pages/TracedSheetPage/TracedSheetPage'
import {buildSheet} from './layout/sheet.ts'

const SVG_URL = '/character-sheet/character-sheet.svg'

// The traced artwork's own extent in viewBox units; its ratio is slightly shorter than A4.
const ARTWORK_WIDTH = 816
const ARTWORK_HEIGHT = 1055.867

/**
 * Props for a character sheet: the localStorage-key prefix its fields persist under (one namespace per sheet page).
 */
interface CharacterPageProps {
    storagePrefix: string
}

/**
 * Renders the character sheet: its fields, built under this sheet's own storage prefix, overlaid on the artwork.
 */
function CharacterPage({storagePrefix}: CharacterPageProps) {
    const {fields} = useMemo(() => buildSheet(storagePrefix), [storagePrefix])

    return (
        <TracedSheetPage
            svgUrl={SVG_URL}
            artworkWidth={ARTWORK_WIDTH}
            artworkHeight={ARTWORK_HEIGHT}
            fields={fields}
            errorHeading="Couldn’t load the character sheet."
            errorBody="The character-sheet artwork failed to load. Check your connection and reload the page."
        />
    )
}

// Exposed so the binder's zoom can scale the sheet to a fraction of the viewport (a future A5 variant sets its own).
CharacterPage.naturalWidth = TRACED_SHEET_NATURAL_WIDTH

export default CharacterPage
