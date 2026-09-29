import type {Migration} from './migrations.ts'

/**
 * v2: a no-op (identity) migration that documents the shape a migration takes. `migrate` receives the entries in
 * version 1's shape and returns them in version 2's; a real migration reshapes or renames keys here.
 */
export const v2: Migration = {
    to: 2,
    migrate: (entries) => ({...entries}),
}
