import {describe, expect, it} from 'vitest'
import {describeHttpFailure} from './httpError.ts'

const lead = (status: number) => `Provider request failed (${status}).`

describe('describeHttpFailure', () => {
    it('appends the server response text to the lead', async () => {
        const response = new Response('invalid_grant: bad redirect_uri', {status: 400})
        expect(await describeHttpFailure(response, lead))
            .toBe('Provider request failed (400). (invalid_grant: bad redirect_uri)')
    })

    it('returns the lead alone when the body is empty', async () => {
        expect(await describeHttpFailure(new Response('', {status: 500}), lead))
            .toBe('Provider request failed (500).')
    })

    it('collapses whitespace and truncates a long body to a one-line hint', async () => {
        const long = `<html>\n  <body>${'x'.repeat(400)}</body>\n</html>`
        const message = await describeHttpFailure(new Response(long, {status: 502}), lead)
        expect(message).toMatch(/^Provider request failed \(502\)\. \(<html> <body>x+…\)$/)
        expect(message.length).toBeLessThan(260)
    })

    it('falls back to the lead when the body cannot be read', async () => {
        // A response whose body has already been consumed throws on a second read.
        const response = new Response('once', {status: 503})
        await response.text()
        expect(await describeHttpFailure(response, lead)).toBe('Provider request failed (503).')
    })
})
