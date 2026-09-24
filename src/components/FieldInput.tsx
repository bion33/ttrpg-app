import { useEffect, useState } from 'react'
import type { FieldDefinition } from '../types/FieldDefinition.ts'
import AutoFitInput from './AutoFitInput'
import CheckboxInput from './CheckboxInput'
import NumericInput from './NumericInput'

const storageKey = (storagePrefix: string, id: string) => `${storagePrefix}.field.${id}`

const loadStoredValue = (storagePrefix: string, id: string, defaultValue: string): string => {
  try {
    return localStorage.getItem(storageKey(storagePrefix, id)) ?? defaultValue
  } catch {
    return defaultValue
  }
}

function FieldInput({ field, storagePrefix }: { field: FieldDefinition; storagePrefix: string }) {
  const [value, setValue] = useState(() =>
    loadStoredValue(storagePrefix, field.id, field.defaultValue ?? '')
  )

  useEffect(() => {
    localStorage.setItem(storageKey(storagePrefix, field.id), value)
  }, [storagePrefix, field.id, value])

  switch (field.type) {
    case 'number':
      return <NumericInput field={field} value={value} onChange={setValue} />
    case 'text':
      return <AutoFitInput field={field} value={value} onChange={setValue} />
    case 'checkbox':
      return <CheckboxInput field={field} value={value} onChange={setValue} />
  }
}

export default FieldInput
