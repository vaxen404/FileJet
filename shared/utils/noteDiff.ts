export interface NoteDiffLine { kind: 'same' | 'added' | 'removed'; text: string }
export function diffNoteLines(before: string, after: string) {
    let truncated = before.length > 200000 || after.length > 200000
    const read = (text: string) => {
        const lines = text.slice(0,200000).split('\n')
        if (lines.length > 1200) truncated = true
        return lines.slice(0,1200).map(line => { if (line.length > 4000) truncated = true; return line.slice(0,4000) })
    }
    const a = read(before), b = read(after), lines: NoteDiffLine[] = []
    let start = 0, end = 0
    while (start < a.length && start < b.length && a[start] === b[start]) { lines.push({ kind: 'same', text: a[start]! }); start++ }
    while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
    const left = a.slice(start,a.length - end), right = b.slice(start,b.length - end)
    if (left.length * right.length > 200000) {
        lines.push(...left.map(text => ({ kind: 'removed' as const, text })), ...right.map(text => ({ kind: 'added' as const, text })))
    } else {
        const rows = Array.from({ length: left.length + 1 }, () => new Uint16Array(right.length + 1))
        for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) rows[i]![j] = left[i] === right[j] ? rows[i+1]![j+1]! + 1 : Math.max(rows[i+1]![j]!,rows[i]![j+1]!)
        let i = 0, j = 0
        while (i < left.length || j < right.length) {
            if (i < left.length && j < right.length && left[i] === right[j]) { lines.push({ kind: 'same', text: left[i++]! }); j++ }
            else if (i < left.length && (j === right.length || rows[i+1]![j]! >= rows[i]![j+1]!)) lines.push({ kind: 'removed', text: left[i++]! })
            else lines.push({ kind: 'added', text: right[j++]! })
        }
    }
    for (const text of a.slice(a.length - end)) lines.push({ kind: 'same', text })
    return { lines, truncated }
}
