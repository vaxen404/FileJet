
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',

    devtools: {
        enabled: true
    },

    modules: [
        '@nuxt/icon'
    ],

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
