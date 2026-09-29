/**
 * Deterministic "messy" decoration for one binder cover, derived from its id so the look is stable across renders:
 * a set of loose papers each with its own offset and rotation.
 */
export interface BookJitter {
    papers: PaperJitter[]
}

/** Rightward offset and vertical offset (rem) plus rotation (deg) of one loose sheet peeking out of a binder. */
export interface PaperJitter {
    dx: number
    dy: number
    rot: number
}

// Number of loose sheets drawn behind each cover.
const PAPER_COUNT = 3

/**
 * Hashes a string to a well-mixed unsigned 32-bit integer so a binder id yields stable, spread-out jitter values.
 */
export function hashSeed(seed: string): number {
    let hash = 0x811c9dc5
    for (let i = 0; i < seed.length; i++) {
        hash ^= seed.charCodeAt(i)
        hash = Math.imul(hash, 0x01000193)
    }
    return hash >>> 0
}

/**
 * A deterministic pseudo-random generator seeded from a hash; each call returns the next value in [0, 1).
 */
function generator(seed: number): () => number {
    let state = seed || 1
    return () => {
        state = Math.imul(state ^ (state >>> 15), 0x2c1b3c6d)
        state = Math.imul(state ^ (state >>> 12), 0x297a2d39)
        state ^= state >>> 15
        return (state >>> 0) / 0x100000000
    }
}

// Maps a unit value in [0, 1) to a signed spread of the given magnitude.
function spread(unit: number, magnitude: number): number {
    return (unit * 2 - 1) * magnitude
}

/**
 * Builds the stable cover tilt and loose-paper jitter for the binder with the given id.
 */
export function bookJitter(seed: string): BookJitter {
    const next = generator(hashSeed(seed))
    const papers: PaperJitter[] = []
    // dx is rightward-only so sheets never poke past the cover's left edge; the small rotation keeps that true too.
    for (let i = 0; i < PAPER_COUNT; i++) {
        papers.push({dx: next() * 0.6, dy: spread(next(), 0.7), rot: spread(next(), 4)})
    }
    return {papers}
}
