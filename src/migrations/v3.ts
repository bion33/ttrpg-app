import type {Migration} from './migrations.ts'

// The per-device view keys (open binder/page, page zoom) that older snapshots synced; frozen here so this historical
// migration keeps stripping exactly those regardless of later changes to the live view-key set.
const STRIPPED_VIEW_KEYS = ['location', 'pageWidthFraction']

/**
 * v3: drops the per-device view keys that earlier snapshots synced, so a loaded snapshot no longer carries another
 * device's open binder/page or zoom level.
 */
export const v3: Migration = {
    to: 3,
    migrate: (entries) => {
        const migrated = {...entries}
        for (const key of STRIPPED_VIEW_KEYS) delete migrated[key]
        return migrated
    },
}
