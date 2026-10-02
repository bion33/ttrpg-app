import {useMemo} from 'react'
import TracedSheetPage, {TRACED_SHEET_NATURAL_WIDTH} from '@pages/TracedSheetPage/TracedSheetPage'
import {buildEquipmentSheet} from './layout/sheet.ts'

const SVG_URL = '/character-sheet/equipment.svg'

// The traced artwork's own extent in viewBox units; its ratio is slightly shorter than A4.
const ARTWORK_WIDTH = 815.88666
const ARTWORK_HEIGHT = 1055.8867

/**
 * Props for an equipment sheet: the localStorage-key prefix its fields persist under (one namespace per sheet page).
 */
interface EquipmentPageProps {
    storagePrefix: string
}

/**
 * Renders the equipment sheet: its fields, built under this sheet's own storage prefix, overlaid on the artwork.
 */
function EquipmentPage({storagePrefix}: EquipmentPageProps) {
    const {fields} = useMemo(() => buildEquipmentSheet(storagePrefix), [storagePrefix])

    return (
        <TracedSheetPage
            svgUrl={SVG_URL}
            artworkWidth={ARTWORK_WIDTH}
            artworkHeight={ARTWORK_HEIGHT}
            fields={fields}
            errorHeading="Couldn’t load the equipment sheet."
            errorBody="The equipment artwork failed to load. Check your connection and reload the page."
        />
    )
}

// Exposed so the binder's zoom can scale the sheet to a fraction of the viewport (a future A5 variant sets its own).
EquipmentPage.naturalWidth = TRACED_SHEET_NATURAL_WIDTH

export default EquipmentPage
