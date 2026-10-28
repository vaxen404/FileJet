import { getAccentColor, type AccentColor } from './appearance'

export const themeModes = [
    { value: 'light', label: 'Light', description: 'Bright and clear', icon: 'solar:sun-2-linear' },
    { value: 'dark', label: 'Dark', description: 'Easy on the eyes', icon: 'solar:moon-linear' },
    { value: 'system', label: 'System', description: 'Follow your device', icon: 'solar:monitor-linear' }
] as const

export type ThemeMode = typeof themeModes[number]['value']
export type ResolvedTheme = 'light' | 'dark'

export const isThemeMode = (value: unknown): value is ThemeMode => themeModes.some(mode => mode.value === value)
export const resolveTheme = (mode: ThemeMode, system: ResolvedTheme): ResolvedTheme => mode === 'system' ? system : mode

export const themePalettes = {
    dark: {
        canvas: '#121214', surface: '#1a1a1d', divider: '#29292e', control: '#202024',
        'surface-hover': '#1f1f23', raised: '#242429', 'control-border': '#303036',
        foreground: '#f3f3f5', secondary: '#b5b5bd', label: '#a8a8b0', muted: '#898991',
        'heading-muted': '#a3a3ab', content: '#d5d5da', input: '#151518', preview: '#141417',
        subtle: '#1d1d21', 'hover-border': '#3a3a41', 'strong-border': '#505057',
        danger: '#ff6b6b', 'danger-hover': '#ff8793', 'danger-surface': '#352024',
        'danger-border': '#4a292d', 'danger-content': '#ffc5cd',
        'info-surface': '#17263a', 'info-border': '#294568', 'info-content': '#c5dcff',
        'selection-surface': '#36363ee6', 'selection-border': '#3a3a42',
        'toast-surface': '#16161c', 'toast-border': '#34343f', 'meter-track': '#2c2c31',
        scrollbar: '#39393f', 'on-primary': '#ffffff', warning: '#fcd34d'
    },
    light: {
        canvas: '#f3f5f9', surface: '#ffffff', divider: '#e2e7ef', control: '#f4f6fa',
        'surface-hover': '#f0f3f9', raised: '#e9edf5', 'control-border': '#d6deea',
        foreground: '#182338', secondary: '#475569', label: '#526078', muted: '#5d6d84',
        'heading-muted': '#59677e', content: '#334155', input: '#f8fafc', preview: '#edf1f7',
        subtle: '#f8fafc', 'hover-border': '#b4c0d2', 'strong-border': '#8b9bb1',
        danger: '#b91c1c', 'danger-hover': '#991b1b', 'danger-surface': '#fff1f2',
        'danger-border': '#fecdd3', 'danger-content': '#9f1239',
        'info-surface': '#eff6ff', 'info-border': '#bfdbfe', 'info-content': '#1e40af',
        'selection-surface': '#fffffff0', 'selection-border': '#cbd5e1',
        'toast-surface': '#ffffff', 'toast-border': '#d6deea', 'meter-track': '#e2e8f0',
        scrollbar: '#a6b2c2', 'on-primary': '#ffffff', warning: '#92400e'
    }
} as const

export const getAppearanceVariables = (theme: ResolvedTheme, accentColor: AccentColor): Record<string, string> => {
    const accent = getAccentColor(accentColor)
    const variables: Record<string, string> = Object.fromEntries(
        Object.entries(themePalettes[theme]).map(([key, value]) => [`--color-${key}`, value])
    )
    variables['--color-primary'] = accent.primary
    variables['--color-accent'] = theme === 'light' ? accent.primary : accent.accent
    variables['--color-highlight'] = accent.highlight
    return variables
}
