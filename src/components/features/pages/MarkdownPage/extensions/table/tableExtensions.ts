import {ReactNodeViewRenderer} from '@tiptap/react'
import {Table, TableCell, TableHeader, TableRow} from '@tiptap/extension-table'
import type {AnyExtension} from '@tiptap/core'
import TableNodeView from './TableNodeView.tsx'
import TableCellNodeView from './TableCellNodeView.tsx'

/**
 * The table extensions with Nextcloud-style editing affordances: node views add edge add-row/add-column buttons, a
 * per-column header "…" menu, and a per-row "…" menu (delete-table on the header row). The node schemas are unchanged,
 * so tables still round-trip as plain markdown. One array, matching the set `TableKit` would otherwise register.
 */
export const tableExtensions: AnyExtension[] = [
    // contentDOMElementTag makes the node's content element a real <tbody>, so ProseMirror's rows are its direct
    // children (a default <div> there would sit between <tbody> and <tr> and break table layout).
    Table.extend({addNodeView: () => ReactNodeViewRenderer(TableNodeView, {contentDOMElementTag: 'tbody'})}),
    TableRow,
    // The cell node view carries the "…" menus; its host must be the real <th>/<td> so the table markup stays valid.
    TableHeader.extend({addNodeView: () => ReactNodeViewRenderer(TableCellNodeView, {as: 'th'})}),
    TableCell.extend({addNodeView: () => ReactNodeViewRenderer(TableCellNodeView, {as: 'td'})}),
]
