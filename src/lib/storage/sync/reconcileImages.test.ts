import {describe, expect, it} from 'vitest'
import {reconcileImages} from './reconcileImages.ts'

// Builds the inventories from plain arrays for terse test cases.
function inventories(referenced: string[], local: string[], remote: string[]) {
    return {referenced: new Set(referenced), local: new Set(local), remote: new Set(remote)}
}

describe('reconcileImages', () => {
    it('uploads images referenced and present locally but missing remotely', () => {
        const result = reconcileImages(inventories(['a', 'b'], ['a', 'b'], ['a']))
        expect(result.toUpload).toEqual(['b'])
    })

    it('downloads images referenced and present remotely but missing locally', () => {
        const result = reconcileImages(inventories(['a', 'b'], ['a'], ['a', 'b']))
        expect(result.toDownload).toEqual(['b'])
    })

    it('deletes remote images no longer referenced', () => {
        const result = reconcileImages(inventories(['a'], ['a'], ['a', 'stale']))
        expect(result.toDeleteRemote).toEqual(['stale'])
    })

    it('GCs local images no longer referenced', () => {
        const result = reconcileImages(inventories(['a'], ['a', 'orphan'], ['a']))
        expect(result.toDeleteLocal).toEqual(['orphan'])
    })

    it('does nothing when everything is already in sync', () => {
        const result = reconcileImages(inventories(['a', 'b'], ['a', 'b'], ['a', 'b']))
        expect(result).toEqual({toUpload: [], toDownload: [], toDeleteRemote: [], toDeleteLocal: []})
    })
})
