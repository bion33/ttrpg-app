import {useState} from 'react'

export function useLocalStorageState<T>(key: string, createInitialValue: () => T) {
    const [value, setValue] = useState<T>(() => {
        const stored = localStorage.getItem(key)
        if (!stored) return createInitialValue()

        try {
            return JSON.parse(stored) as T
        } catch {
            return createInitialValue()
        }
    })

    function set(next: T | ((previous: T) => T)) {
        setValue((previous) => {
            const resolved =
                typeof next === 'function'
                    ? (next as (previous: T) => T)(previous)
                    : next
            localStorage.setItem(key, JSON.stringify(resolved))
            return resolved
        })
    }

    return [value, set] as const
}
