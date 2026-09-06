import {CharacterSheetProvider} from './context/CharacterSheetContext'
import {AppToolbar} from './components/AppToolbar/AppToolbar'
import {CharacterSheet} from './components/CharacterSheet/CharacterSheet'

function App() {
    return (
        <CharacterSheetProvider>
            <AppToolbar/>
            <CharacterSheet/>
        </CharacterSheetProvider>
    )
}

export default App
