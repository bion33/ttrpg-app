import styles from './ExpertiseCheckbox.module.css'

interface ExpertiseCheckboxProps {
    checked: boolean
    onChange: (checked: boolean) => void
    className?: string
    'aria-label'?: string
}

export function ExpertiseCheckbox({
                                       checked,
                                       onChange,
                                       className: extraClassName,
                                       'aria-label': ariaLabel,
                                   }: ExpertiseCheckboxProps) {
    const className = [styles.wrapper, extraClassName ?? ''].filter(Boolean).join(' ')

    return (
        <label className={className}>
            <input
                type="checkbox"
                className={styles.input}
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
                aria-label={ariaLabel}
            />
            <span className={styles.mark} aria-hidden="true" />
            <span className={styles.outline} aria-hidden="true" />
        </label>
    )
}
