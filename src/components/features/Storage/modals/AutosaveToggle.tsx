/** Props for the autosave toggle: the current preference and the change handler from `useStorage`. */
interface AutosaveToggleProps {
    enabled: boolean
    onChange: (enabled: boolean) => void
}

/**
 * The device-local "Autosave & autoload" checkbox shown in every connected cloud provider's view, governing both
 * automatic saves and automatic catch-up loads.
 */
function AutosaveToggle({enabled, onChange}: AutosaveToggleProps) {
    return (
        <label className="storage-connect__toggle">
            <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)}/>
            <span>
                <strong>Autosave &amp; autoload</strong>
                <small>Save changes automatically and keep this device up to date.</small>
            </span>
        </label>
    )
}

export default AutosaveToggle
