import styles from './InkCheckbox.module.css'

interface InkCheckboxProps {
    checked: boolean
    onChange: (checked: boolean) => void
    round?: boolean
    'aria-label'?: string
}

export function InkCheckbox({
                                checked,
                                onChange,
                                round = false,
                                'aria-label': ariaLabel,
                            }: InkCheckboxProps) {
    const className = [styles.checkbox, round ? styles['checkbox--round'] : '']
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
