import './ColorPicker.css'

/**
 * Props for the colour picker: the current hue, a change handler, the preset hues to offer, and a preview function
 * mapping a hue to the CSS colour the slider, swatches, and live preview should show.
 */
interface ColorPickerProps {
    hue: number
    onChange: (hue: number) => void
    presets: number[]
    preview: (hue: number) => string
}

/**
 * A hue slider with preset swatches and a live-preview swatch, sharing the modal form styling for its labelled field.
 */
function ColorPicker({hue, onChange, presets, preview}: ColorPickerProps) {
    return (
        <>
            <label className="modal__field">
                <span>Color</span>
                <input type="range" min={0} max={359} value={hue}
                       onChange={(event) => onChange(Number(event.target.value))}/>
            </label>
            <div className="color-picker__presets">
                {presets.map((preset) => (
                    <button key={preset} type="button" className="color-picker__preset"
                            style={{background: preview(preset)}} aria-label={`Hue ${preset}`}
                            onClick={() => onChange(preset)}/>
                ))}
            </div>
            <div className="color-picker__swatch" style={{background: preview(hue)}}/>
        </>
    )
}

export default ColorPicker
