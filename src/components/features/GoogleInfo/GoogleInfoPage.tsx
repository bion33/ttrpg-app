import InfoPage from '@ui/InfoPage/InfoPage.tsx'
import RouteLink from '@ui/RouteLink/RouteLink.tsx'

/**
 * The standalone application homepage used for Google's OAuth branding and app-ownership verification: identifies the
 * app and its developer, describes what it does, and states how it uses Google Drive data. Served at its own URL.
 */
function GoogleInfoPage() {
    return (
        <InfoPage title="TTRPG-App">
            <p>
                TTRPG-App is a free, open-source tabletop role-playing game character app. It lets you organise your
                characters into a library of binders, each holding a set of pages. You chose which types of pages to add
                and how many. Pages include the standard character sheets with interactive fields and markdown notes.
                You can create your own reusable markdown templates, and create binder templates with a predefined set
                of pages in a particular order. The app runs entirely in your browser, with no account required.
            </p>

            <h2>Developer</h2>
            <p>
                This app is developed and maintained as an open-source project. Its source code is available on{' '}
                <a href="https://github.com/bion33/ttrpg-app" target="_blank" rel="noreferrer">GitHub</a>.
            </p>

            <h2>Privacy and terms</h2>
            <p>
                How your data is handled is described in full on the <RouteLink route="privacy">privacy page</RouteLink>,
                and the conditions of use on the <RouteLink route="terms">terms of service page</RouteLink>.
            </p>

            <h2>What the app does with Google Drive</h2>
            <p>
                Connecting Google Drive is entirely optional and is only used to back up and sync your own data. When you
                connect it, the app stores a single snapshot of your characters in an app-specific folder of your own
                Google Drive account, and reads that snapshot back when you load it. The app:
            </p>
            <ul>
                <li>only accesses files it creates in its own app-specific folder;</li>
                <li>never reads, lists, or modifies any of your other Google Drive files;</li>
                <li>does not share, sell, or transfer your Google data to anyone.</li>
            </ul>
            <p>
                Sign-in uses OAuth, and the resulting credentials are stored in your browser alone. Authentication
                exchanges are relayed through this app's server only for security, where no data is kept.
            </p>
        </InfoPage>
    )
}

export default GoogleInfoPage
