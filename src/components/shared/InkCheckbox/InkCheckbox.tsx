import styles from './InkCheckbox.module.css'

interface InkCheckboxProps {
    checked: boolean
    onChange: (checked: boolean) => void
    rotated?: boolean
    small?: boolean
    className?: string
    'aria-label'?: string
}

export function InkCheckbox({
                                checked,
                                onChange,
                                rotated = false,
                                small = false,
                                className: extraClassName,
                                'aria-label': ariaLabel,
                            }: InkCheckboxProps) {
    const className = [
        styles.checkbox,
        rotated ? styles['checkbox--rotated'] : '',
        small ? styles['checkbox--small'] : '',
        extraClassName ?? '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <input
            type="checkbox"
            className={className}
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            aria-label={ariaLabel}
        />
    )
}
