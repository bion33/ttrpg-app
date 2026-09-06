import {SheetField} from '../shared/SheetField/SheetField'
import {useCharacterSheet} from '../../context/useCharacterSheet'

export function ResistancesField() {
    const {sheet, updateSheet} = useCharacterSheet()

    return (
        <div style={{height: 74}}>
            <SheetField
                label="Immunities, Resistances & Vulnerabilities"
                value={sheet.resistances}
                onChange={(value) =>
                    updateSheet((current) => ({...current, resistances: value}))
                }
                labelPosition="top"
                multiline
            />
        </div>
    )
}
