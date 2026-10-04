import InfoPage from '@ui/InfoPage/InfoPage.tsx'
import RouteLink from '@ui/RouteLink/RouteLink.tsx'

/**
 * The standalone terms-of-service page: states that the app is free and provided as-is, and that any storage provider
 * you connect is used under its own terms. Served at its own URL, independent of the in-app binder/page location.
 */
function TermsPage() {
    return (
        <InfoPage title="Terms of Service">
            <h2>No warranty</h2>
            <p>
                This app is provided as-is, free of charge, for you to use as you see fit, without warranty of any kind,
                express or implied, including but not limited to the warranties of merchantability, fitness for a particular
                purpose, and non-infringement. To the fullest extent permitted by law, the authors are not liable for any
                claim, damages, or other liability arising from your use of the app, including any loss of data.
            </p>

            <h2>Privacy and data</h2>
            <p>
                How your data is handled is described in the <RouteLink route="privacy">privacy page</RouteLink>.
                You are responsible for the content you create and for keeping your own back-ups. The app does its very best
                to keep your data safe, but you remain responsible for creating a copy of anything important to you.
            </p>

            <h2>Storage providers</h2>
            <p>
                When you connect an external storage provider, you also agree to that provider's own terms. We have no
                control over those services and are not responsible for them:
            </p>
            <ul>
                <li>
                    <strong>Nextcloud</strong>: your use is governed by the terms and policies of the Nextcloud host you
                    choose.
                </li>
                <li>
                    <strong>
                        <a href="https://onedrive.live.com" target="_blank" rel="noreferrer">OneDrive</a>
                    </strong>:
                    your use is governed by the <a href="https://www.microsoft.com/servicesagreement" target="_blank" rel="noreferrer">
                        Microsoft Services Agreement
                    </a>.
                </li>
                <li>
                    <strong>
                        <a href="https://drive.google.com" target="_blank" rel="noreferrer">Google Drive</a>
                    </strong>:
                    your use is governed by <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
                        Google's Terms of Service
                    </a>.
                </li>
            </ul>
        </InfoPage>
    )
}

export default TermsPage
