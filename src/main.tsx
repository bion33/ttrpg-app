import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import '@fontsource/kalam/400.css'
import '@fontsource/kalam/700.css'
import '@fontsource/eb-garamond/400.css'
import '@fontsource/eb-garamond/500.css'
import '@fontsource/eb-garamond/600.css'
import '@fontsource/im-fell-english-sc/400.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)
