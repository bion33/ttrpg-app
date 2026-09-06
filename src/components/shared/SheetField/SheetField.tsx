import {useId} from 'react'
import styles from './SheetField.module.css'

interface SheetFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    labelPosition?: 'top' | 'bottom'
    multiline?: boolean
    type?: 'text' | 'number'
    className?: string
}

export function SheetField({
                               label,
                               value,
                               onChange,
                               labelPosition = 'bottom',
                               multiline = false,
                               type = 'text',
                               className,
                           }: SheetFieldProps) {
    const inputId = useId()
    const fieldClassName = [
        styles.field,
        labelPosition === 'bottom' ? styles['field--labelBottom'] : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <div className={fieldClassName}>
            <label className={styles.label} htmlFor={inputId}>
                {label}
            </label>
            {multiline ? (
                <textarea
                    id={inputId}
                    className={`${styles.control} ${styles['control--multiline']}`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <input
                    id={inputId}
                    type={type}
                    className={styles.control}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </div>
    )
}
