import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter} from 'react-router'
import './index.css'
import App from './App.tsx'
import {migrateLocalStorage} from '@lib/storage/snapshot.ts'

// Migrate live localStorage to the current schema before React mounts, so every atomWithStorage atom reads the new
// shape on first render.
migrateLocalStorage(window.localStorage)

// The router sits above App so the URL (the source of truth for location) survives App swapping its jotai store.
createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    </StrictMode>,
)
