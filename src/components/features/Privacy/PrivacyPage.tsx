import InfoPage from '@ui/InfoPage/InfoPage.tsx'

/**
 * The standalone privacy page: explains that data is local-first and describes each optional storage provider it can
 * be synced to. Served at its own URL, independent of the in-app binder/page location.
 */
function PrivacyPage() {
    return (
        <InfoPage title="Privacy">
            <p>
                This app runs entirely in your browser. You do not need an account and it has no server to store your data.
                Everything you create within it is saved in your browser's local storage on your own device.
            </p>

            <h2>Back-up and sync</h2>
            <p>
                You can optionally save a snapshot of all your data to a storage provider of your choice. This only
                ever happens when you explicitly use or connect to such a provider:
            </p>
            <ul>
                <li>
                    <strong>File</strong>: the snapshot is downloaded to your device.
                </li>
                <li>
                    <strong>Nextcloud</strong>: the snapshot is uploaded to the Nextcloud instance of the public share link you provide.
                    How the data is handled depends entirely on the policies of that Nextcloud instance.
                    Requests pass through this app's server only to reach your host, of which no data is kept.
                </li>
                <li>
                    <strong>
                        <a href="https://onedrive.live.com" target="_blank" rel="noreferrer">OneDrive</a>
                    </strong>:
                    the snapshot is stored in an app-specific folder of your own Microsoft OneDrive account. Sign-in and handling of data
                    are governed by <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">
                        Microsoft's privacy statement
                    </a>.
                </li>
                <li>
                    <strong>
                        <a href="https://drive.google.com" target="_blank" rel="noreferrer">Google Drive</a>
                    </strong>:
                    the snapshot is stored in an app-specific folder of your own Google Drive account. Sign-in and handling of data
                    are governed by <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                        Google's privacy policy
                    </a>.
                </li>
            </ul>

            <h2>Cloud sign-in</h2>
            <p>
                For OneDrive and Google Drive, sign-in uses OAuth, of which all data is stored in your browser alone.
                Authentication exchanges are relayed through this app's server for security, of which no data is kept.
            </p>

            <h2>What we don't do</h2>
            <p>
                There is no analytics, tracking, or advertising, and your data is never stored, sold or shared with anyone
                beyond your browser and the storage providers you explicitly connect to.
            </p>
        </InfoPage>
    )
}

export default PrivacyPage
