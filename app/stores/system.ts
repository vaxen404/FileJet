import { defineStore } from "pinia";

export const useSystemStore = defineStore('system', {
    state: () => ({
        isLoggedIn: false,
        user: null as string | null
    }),
    actions: {
        login(username: string) {
            this.isLoggedIn = true
            this.user = username
        },
        logout() {
            this.isLoggedIn = false
            this.user = null
        }
    }
})