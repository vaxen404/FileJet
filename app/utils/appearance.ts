export const accentColors = [
    { value: 'indigo', label: 'Indigo', primary: '#3c47be', accent: '#8b7cff', highlight: '#5a5aff' },
    { value: 'blue', label: 'Blue', primary: '#1d4ed8', accent: '#78afff', highlight: '#2563eb' },
    { value: 'violet', label: 'Violet', primary: '#6d28d9', accent: '#bd9aff', highlight: '#7c3aed' },
    { value: 'emerald', label: 'Emerald', primary: '#047857', accent: '#6cdbb0', highlight: '#047857' },
    { value: 'rose', label: 'Rose', primary: '#be123c', accent: '#ff93ae', highlight: '#e11d48' },
    { value: 'amber', label: 'Amber', primary: '#92400e', accent: '#f8c76a', highlight: '#b45309' }
] as const

export type AccentColor = typeof accentColors[number]['value']

export const getAccentColor = (value: AccentColor) => accentColors.find(color => color.value === value) ?? accentColors[0]
