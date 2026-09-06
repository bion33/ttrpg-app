import type {ReactNode} from 'react'
import styles from './ColumnHeading.module.css'

export function ColumnHeading({children}: { children: ReactNode }) {
    return <div className={styles.heading}>{children}</div>
}
