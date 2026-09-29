import type {MouseEvent, ReactNode} from 'react'
import './IconButton.css'

/**
 * Props for a round icon button: the icon it shows, its accessible name and hover label, which side that label
 * opens toward, an optional colour variant and size, whether it is disabled, and the click handler (given the event).
 */
interface IconButtonProps {
    icon: ReactNode
    label: string
    onClick: (event: MouseEvent<HTMLButtonElement>) => void
    labelSide?: 'left' | 'right'
    variant?: 'default' | 'danger'
    size?: 'default' | 'large'
    disabled?: boolean
}

/**
 * A round, Material-style button showing an icon at rest and revealing its text label on hover or focus.
 */
function IconButton(
    {icon, label, onClick, labelSide = 'left', variant = 'default', size = 'default', disabled = false}: IconButtonProps,
) {
    return (
        <button
            type="button"
            className={`icon-button icon-button--label-${labelSide}${
                variant === 'danger' ? ' icon-button--danger' : ''
            }${size === 'large' ? ' icon-button--large' : ''}`}
            data-label={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
        >
            {icon}
        </button>
    )
}

export default IconButton
