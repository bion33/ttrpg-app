import {describe, expect, it} from 'vitest'
import {bookJitter, hashSeed} from './bookJitter.ts'

describe('hashSeed', () => {
    it('is deterministic for a given seed', () => {
        expect(hashSeed('abc')).toBe(hashSeed('abc'))
    })

    it('separates similar seeds', () => {
        expect(hashSeed('binder-1')).not.toBe(hashSeed('binder-2'))
    })
})

describe('bookJitter', () => {
    it('is deterministic for a given id', () => {
        expect(bookJitter('some-id')).toEqual(bookJitter('some-id'))
    })

    it('differs between ids', () => {
        expect(bookJitter('a')).not.toEqual(bookJitter('b'))
    })

    it('produces one entry per loose sheet with bounded, rightward-only jitter', () => {
        for (const id of ['deadbeef', 'a', 'b', 'c', 'd']) {
            const {papers} = bookJitter(id)
            expect(papers).toHaveLength(3)
            for (const paper of papers) {
                // dx never negative so no sheet crosses the cover's left edge.
                expect(paper.dx).toBeGreaterThanOrEqual(0)
                expect(paper.dx).toBeLessThanOrEqual(0.6)
                expect(Math.abs(paper.dy)).toBeLessThanOrEqual(0.7)
                expect(Math.abs(paper.rot)).toBeLessThanOrEqual(4)
            }
        }
    })
})
