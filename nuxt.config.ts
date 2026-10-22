import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',

    devtools: {
        enabled: true
    },

    modules: ['@nuxt/icon'],

    css: ['~/assets/css/tailwind.css'],

    vite: {
        plugins: [tailwindcss()],
        esbuild: {
            target: 'es2020'
        }
    },

    nitro: {
        esbuild: {
            options: {
                target: 'es2020'
            }
        }
    },

    imports: {
        dirs: [
            'composables',
            'composables/**',
            'utils',
            'utils/**',
            'shared/schemas',
            'shared/schemas/**'
        ]
    },

    components: [
        {
            path: '~/components',
            pathPrefix: false
        }
    ]
})