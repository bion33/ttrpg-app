import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import {Decoration, DecorationSet, type EditorView} from '@tiptap/pm/view'
import {type BlockMeasurement, computeBreaks, pageCount} from '../../logic/pagination/pagination.ts'

/**
 * Options for the pagination extension: a callback fired with the number of A4 sheets the content currently spans, so
 * the editor can render that many backdrop sheets behind the flow.
 */
export interface PaginationOptions {
    onPageCountChange: (count: number) => void
}

// The rendered sheet geometry (px) the break math needs, read from the live backdrop so CSS stays its single source.
interface SheetGeometry {
    contentCapacity: number
    interSheetSkip: number
}

const paginationKey = new PluginKey<DecorationSet>('pagination')

/**
 * Reads the content capacity and inter-sheet skip (px) from the rendered sheets and the editor column's own margins, so
 * the break math uses the same dimensions the CSS lays out; returns null until the backdrop is present and sized.
 */
function readSheetGeometry(editorDom: HTMLElement): SheetGeometry | null {
    const sheets = editorDom.closest('.md-sheets')
    const backdrop = sheets?.querySelector('.md-sheet-backdrop')
    const sheet = backdrop?.querySelector('.md-sheet')
    if (!(backdrop instanceof HTMLElement) || !(sheet instanceof HTMLElement)) return null
    const columnStyle = getComputedStyle(editorDom)
    const paddingTop = parseFloat(columnStyle.paddingTop)
    const paddingBottom = parseFloat(columnStyle.paddingBottom)
    const contentCapacity = sheet.clientHeight - paddingTop - paddingBottom
    if (contentCapacity <= 0) return null
    const gap = parseFloat(getComputedStyle(backdrop).rowGap) || 0
    return {contentCapacity, interSheetSkip: paddingTop + paddingBottom + gap}
}

/**
 * Measures each top-level block's border-box height and vertical margins separately (rounded to whole px to keep the
 * result stable across relayouts), so the break math can collapse adjacent margins; flags the manual page-break nodes.
 */
function measureBlocks(view: EditorView): BlockMeasurement[] {
    const blocks: BlockMeasurement[] = []
    view.state.doc.forEach((node, offset) => {
        const dom = view.nodeDOM(offset)
        const isManualBreak = node.type.name === 'pageBreak'
        if (!(dom instanceof HTMLElement)) {
            blocks.push({height: 0, marginTop: 0, marginBottom: 0, isManualBreak})
            return
        }
        const style = getComputedStyle(dom)
        blocks.push({
            height: Math.round(dom.offsetHeight),
            marginTop: Math.round(parseFloat(style.marginTop)),
            marginBottom: Math.round(parseFloat(style.marginBottom)),
            isManualBreak,
        })
    })
    return blocks
}

// A spacer widget that fills the rest of the finishing sheet so the following block starts on the next sheet.
function spacerWidget(height: number): HTMLElement {
    const spacer = document.createElement('div')
    spacer.className = 'md-page-spacer'
    spacer.style.height = `${height}px`
    spacer.setAttribute('contenteditable', 'false')
    spacer.setAttribute('aria-hidden', 'true')
    return spacer
}

// The positions just before each top-level block, so a break's block index maps to a document position.
function topLevelPositions(view: EditorView): number[] {
    const positions: number[] = []
    let position = 0
    view.state.doc.forEach((node) => {
        positions.push(position)
        position += node.nodeSize
    })
    return positions
}

/**
 * Builds the pagination decorations (a spacer widget plus a print break-marker class before each breaking block) and
 * the sheet count, from the current measurements and the live sheet geometry.
 */
function buildPagination(view: EditorView, geometry: SheetGeometry): {decorations: DecorationSet; count: number} {
    const blocks = measureBlocks(view)
    const breaks = computeBreaks(blocks, geometry)
    const positions = topLevelPositions(view)
    const decorations: Decoration[] = []
    for (const pageBreak of breaks) {
        const from = positions[pageBreak.beforeIndex]
        const node = view.state.doc.child(pageBreak.beforeIndex)
        const height = Math.max(0, Math.round(pageBreak.spacerHeight))
        decorations.push(Decoration.widget(from, () => spacerWidget(height), {
            side: -1,
            key: `page-spacer-${pageBreak.beforeIndex}-${height}`,
        }))
        decorations.push(Decoration.node(from, from + node.nodeSize, {class: 'md-break-before'}))
    }
    return {decorations: DecorationSet.create(view.state.doc, decorations), count: pageCount(breaks)}
}

// A stable signature of the computed decorations, so the view only re-dispatches when the pagination actually changes.
function signature(decorations: DecorationSet, count: number): string {
    const parts = decorations.find().map((decoration) => `${decoration.from}:${(decoration as {spec: {key?: string}}).spec.key ?? 'n'}`)
    return `${count}|${parts.join(',')}`
}

/**
 * A custom pagination extension: a single editor whose content flows across stacked A4 sheets. It measures the blocks,
 * inserts spacer gaps at manual page breaks and automatic overflow points, and reports the sheet count for the backdrop.
 */
export const Pagination = Extension.create<PaginationOptions>({
    name: 'pagination',

    addOptions() {
        return {onPageCountChange: () => {}}
    },

    addProseMirrorPlugins() {
        const onPageCountChange = this.options.onPageCountChange
        return [
            new Plugin<DecorationSet>({
                key: paginationKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply(transaction, old) {
                        const next = transaction.getMeta(paginationKey) as DecorationSet | undefined
                        if (next) return next
                        return old.map(transaction.mapping, transaction.doc)
                    },
                },
                props: {
                    decorations(state) {
                        return paginationKey.getState(state)
                    },
                },
                view(view) {
                    let frame = 0
                    let lastSignature = ''
                    const measure = () => {
                        frame = 0
                        if (view.isDestroyed) return
                        const geometry = readSheetGeometry(view.dom as HTMLElement)
                        if (!geometry) return
                        const {decorations, count} = buildPagination(view, geometry)
                        const current = signature(decorations, count)
                        if (current === lastSignature) return
                        lastSignature = current
                        onPageCountChange(count)
                        view.dispatch(view.state.tr.setMeta(paginationKey, decorations))
                    }
                    const schedule = () => {
                        if (frame) return
                        frame = requestAnimationFrame(measure)
                    }
                    const resizeObserver = new ResizeObserver(schedule)
                    resizeObserver.observe(view.dom)
                    schedule()
                    return {
                        update: schedule,
                        destroy: () => {
                            if (frame) cancelAnimationFrame(frame)
                            resizeObserver.disconnect()
                        },
                    }
                },
            }),
        ]
    },
})
