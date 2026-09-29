import Library from './components/features/Library/Library.tsx'
import {useNavigationHistory} from './hooks/useNavigation.ts'

/**
 * Application root; wires location to browser history and renders the library of binders.
 */
function App() {
    useNavigationHistory()
    return <Library/>
}

export default App
