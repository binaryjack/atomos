export type ThemeMode = 'sovereign-dark' | 'clean-paper' | 'transparent-vector';

export interface ThemeConfig {
    background: string;
    entityBg: string;
    entityBorder: string;
    entityText: string;
    propertyText: string;
    edgeColor: string;
    edgeWidth: number;
}

export const themes: Record<ThemeMode, ThemeConfig> = {
    'sovereign-dark': {
        background: '#0F172A',
        entityBg: '#1E293B',
        entityBorder: '#334155',
        entityText: '#F8FAFC',
        propertyText: '#94A3B8',
        edgeColor: '#FBBF24',
        edgeWidth: 2
    },
    'clean-paper': {
        background: '#FFFFFF',
        entityBg: '#F8FAFC',
        entityBorder: '#E2E8F0',
        entityText: '#0F172A',
        propertyText: '#475569',
        edgeColor: '#3B82F6',
        edgeWidth: 2
    },
    'transparent-vector': {
        background: 'transparent',
        entityBg: '#1E293B',
        entityBorder: '#334155',
        entityText: '#F8FAFC',
        propertyText: '#94A3B8',
        edgeColor: '#FBBF24',
        edgeWidth: 2
    }
};
