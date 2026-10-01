import {forwardRef} from 'react'
import type {ButtonHTMLAttributes, MouseEvent, ReactNode} from 'react'
import './IconButton.css'

/**
 * Props for a round icon button: the icon it shows, its accessible name and hover label, which side that label
 * opens toward, an optional colour variant and size, whether it is disabled, and the click handler (given the event).
 * Any other native button attributes (and a ref) pass through, so it can back a Radix `asChild` trigger.
 */
interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
    icon: ReactNode
    label: string
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void
    labelSide?: 'left' | 'right'
    variant?: 'default' | 'danger'
    size?: 'small' | 'default' | 'large'
    disabled?: boolean
}

/**
 * A round, Material-style button showing an icon at rest and revealing its text label on hover or focus.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    {
        icon,
        label,
        onClick,
        labelSide = 'left',
        variant = 'default',
        size = 'default',
        disabled = false,
        className,
        ...rest
    },
    ref,
) {
    return (
        <button
            type="button"
            ref={ref}
            className={`icon-button has-tooltip has-tooltip--${labelSide}${
                variant === 'danger' ? ' icon-button--danger' : ''
            }${size === 'large' ? ' icon-button--large' : ''}${
                size === 'small' ? ' icon-button--small' : ''
            }${className ? ` ${className}` : ''}`}
            data-tooltip={label}
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
            {...rest}
        >
            {icon}
        </button>
    )
})

export default IconButton
