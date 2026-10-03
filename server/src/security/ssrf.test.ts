import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {assertAllowedTarget, RelayNotConfiguredError} from './ssrf.ts'

const originalEnv = {...process.env}

beforeEach(() => {
    delete process.env.NODE_ENV
    delete process.env.NEXTCLOUD_ALLOWED_HOSTS
})

afterEach(() => {
    process.env = {...originalEnv}
})

describe('assertAllowedTarget', () => {
    it('throws on an unparseable URL', () => {
        expect(() => assertAllowedTarget('not a url')).toThrow(/Invalid target URL/)
    })

    describe('production', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production'
        })

        it('refuses every forward when the allowlist is empty (fail closed)', () => {
            expect(() => assertAllowedTarget('https://cloud.example.com/x')).toThrow(RelayNotConfiguredError)
        })

        it('allows a host on the allowlist', () => {
            process.env.NEXTCLOUD_ALLOWED_HOSTS = 'cloud.example.com'
            expect(assertAllowedTarget('https://cloud.example.com/remote.php').hostname).toBe('cloud.example.com')
        })

        it('rejects a host not on the allowlist', () => {
            process.env.NEXTCLOUD_ALLOWED_HOSTS = 'cloud.example.com'
            expect(() => assertAllowedTarget('https://evil.example.net/x')).toThrow(/not allowed/)
        })

        it('matches the host case-insensitively', () => {
            process.env.NEXTCLOUD_ALLOWED_HOSTS = 'Cloud.Example.com'
            expect(assertAllowedTarget('https://CLOUD.example.COM/x').hostname).toBe('cloud.example.com')
        })

        it('rejects a non-https target even when allowlisted', () => {
            process.env.NEXTCLOUD_ALLOWED_HOSTS = 'cloud.example.com'
            expect(() => assertAllowedTarget('http://cloud.example.com/x')).toThrow(/https/)
        })
    })

    describe('development', () => {
        it('allows any target when the allowlist is unset', () => {
            expect(assertAllowedTarget('http://localhost:8080/x').hostname).toBe('localhost')
        })

        it('still enforces a set allowlist', () => {
            process.env.NEXTCLOUD_ALLOWED_HOSTS = 'cloud.example.com'
            expect(() => assertAllowedTarget('http://localhost:8080/x')).toThrow(/not allowed/)
            expect(assertAllowedTarget('http://cloud.example.com/x').hostname).toBe('cloud.example.com')
        })
    })
})
