import {useMemo} from 'react'
import TracedSheetPage, {TRACED_SHEET_NATURAL_WIDTH} from '@pages/TracedSheetPage/TracedSheetPage'
import {buildInfoSheet} from './layout/sheet.ts'

const SVG_URL = '/character-sheet/character-info.svg'

// The traced artwork's own extent in viewBox units; its ratio is slightly shorter than A4.
const ARTWORK_WIDTH = 815.96265
const ARTWORK_HEIGHT = 1055.9626

/**
 * Props for a character-info sheet: the localStorage-key prefix its fields persist under (one namespace per sheet page).
 */
interface CharacterInfoPageProps {
    storagePrefix: string
}

/**
 * Renders the character-info sheet: its fields, built under this sheet's own storage prefix, overlaid on the artwork.
 */
function CharacterInfoPage({storagePrefix}: CharacterInfoPageProps) {
    const {fields} = useMemo(() => buildInfoSheet(storagePrefix), [storagePrefix])

    return (
        <TracedSheetPage
            svgUrl={SVG_URL}
            artworkWidth={ARTWORK_WIDTH}
            artworkHeight={ARTWORK_HEIGHT}
            fields={fields}
            errorHeading="Couldn’t load the character info sheet."
            errorBody="The character-info artwork failed to load. Check your connection and reload the page."
        />
    )
}

// Exposed so the binder's zoom can scale the sheet to a fraction of the viewport (a future A5 variant sets its own).
CharacterInfoPage.naturalWidth = TRACED_SHEET_NATURAL_WIDTH

export default CharacterInfoPage
