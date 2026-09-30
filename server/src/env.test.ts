import {afterEach, describe, expect, it} from 'vitest'
import {env} from './env.ts'

const originalEnv = {...process.env}

afterEach(() => {
  process.env = {...originalEnv}
})

describe('env', () => {
  it('returns the variable value when set', () => {
    process.env.EXAMPLE_VAR = 'value'
    expect(env('EXAMPLE_VAR')).toBe('value')
  })

  it('returns the fallback when the variable is unset', () => {
    delete process.env.EXAMPLE_VAR
    expect(env('EXAMPLE_VAR', 'fallback')).toBe('fallback')
  })

  it('throws when neither the variable nor a fallback is set', () => {
    delete process.env.EXAMPLE_VAR
    expect(() => env('EXAMPLE_VAR')).toThrow(/EXAMPLE_VAR/)
  })
})
