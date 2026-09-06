import {useId} from 'react'
import styles from './SheetField.module.css'

interface SharedProps {
    label: string
    labelPosition?: 'top' | 'bottom'
    multiline?: boolean
    className?: string
}

type SheetFieldProps =
    | (SharedProps & {type?: 'text'; value: string; onChange: (value: string) => void})
    | (SharedProps & {type: 'number'; value: number; onChange: (value: number) => void})

export function SheetField(props: SheetFieldProps) {
    const {label, value, labelPosition = 'bottom', multiline = false, type = 'text', className} = props
    const inputId = useId()
    const fieldClassName = [
        styles.field,
        labelPosition === 'bottom' ? styles['field--labelBottom'] : '',
        className,
    ]
        .filter(Boolean)
        .join(' ')

    function handleChange(rawValue: string) {
        if (props.type === 'number') {
            props.onChange(Number(rawValue) || 0)
        } else {
            props.onChange(rawValue)
        }
    }

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
                    onChange={(event) => handleChange(event.target.value)}
                />
            ) : (
                <input
                    id={inputId}
                    type={type}
                    className={styles.control}
                    value={value}
                    onChange={(event) => handleChange(event.target.value)}
                />
            )}
        </div>
    )
}
