import {type SyntheticEvent, useEffect, useRef, useState} from 'react'

/**
 * Shared state and submit handling for the add/edit dialogues' name field: holds the editable name, focuses the input
 * on mount, and returns a submit handler that trims the name, ignores an empty one, and reports the trimmed value.
 */
export function useNameForm(initialName: string, onSubmit: (name: string) => void) {
    const [name, setName] = useState(initialName)
    const nameReference = useRef<HTMLInputElement>(null)

    useEffect(() => {
        nameReference.current?.focus()
    }, [])

    // Validates the name, then reports the trimmed value to the parent.
    function submit(event: SyntheticEvent) {
        event.preventDefault()
        const trimmed = name.trim()
        if (!trimmed) return
        onSubmit(trimmed)
    }

    return {name, setName, nameReference, submit}
}
