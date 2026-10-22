<template>
    <div class="login-page w-full min-h-dvh bg-canvas flex justify-center items-center">
        <div class="login-card w-152 p-8 bg-surface border border-[#202025] rounded-3xl flex flex-col">
            <h2 class="[font-family:Arial,_Helvetica,_sans-serif] text-[1.8rem] text-[#f5f5f5] mt-0 mr-0 mb-14 ml-0">Login</h2>

            <div class="form-group flex flex-col mt-0 mr-0 mb-8 ml-0 gap-[0.3rem]">
                <label class="block [font-family:Arial,_Helvetica,_sans-serif] text-sm leading-[inherit] font-medium text-[#f1f1f1]
                    uppercase">Username<i class="text-[#ff3b3b] not-italic ml-1">*</i></label>
                <input class="w-full text-base leading-[inherit] p-3.5 bg-[#252529] text-white border border-[#2f2f33] rounded-md
                    outline-none focus:border focus:border-highlight"
                    type="text"
                    v-model="username"
                />
            </div>

            <div class="form-group flex flex-col mt-0 mr-0 mb-8 ml-0 gap-[0.3rem]">
                <label class="block [font-family:Arial,_Helvetica,_sans-serif] text-sm leading-[inherit] font-medium text-[#f1f1f1]
                    uppercase">Password<i class="text-[#ff3b3b] not-italic ml-1">*</i></label>
                <div class="input-box relative w-full">
                    <input class="w-full text-base leading-[inherit] p-3.5 bg-[#252529] text-white border border-[#2f2f33] rounded-md
                        outline-none pr-12 focus:border focus:border-highlight"
                        :type="isView ? 'text' : 'password'"
                        @keyup.enter="handleLogin"
                        v-model="password"
                    />
                    <button
                        v-if="password.length > 0"
                        @click="isView = !isView"
                        class="password-icon flex justify-center items-center absolute right-[0.6rem] top-1/2 -translate-y-1/2
                        text-[1.1rem] border-0 rounded-md bg-[#232327] text-[#f5f5f5] cursor-pointer transition-colors
                        duration-300 ease-[ease] hover:bg-divider size-8"
                    >
                        <Icon :name="isView ? 'lucide:eye' : 'lucide:eye-closed'" />
                    </button>
                </div>
            </div>

            <div class="login-actions flex flex-row gap-3">
                <button
                    @click="handleLogin"
                    class="login-btn flex-1 p-2.5 text-[1.1rem] bg-highlight rounded-md border border-highlight text-white
                    cursor-pointer transition-colors duration-300 ease-[ease] hover:border-[#f1f1f1]"
                >
                    <Icon name="lucide:lock" />
                    Login
                </button>

                <button class="auth-btn flex justify-center items-center bg-[#2f2f33] text-white rounded-md border border-[#2f2f33]
                    text-2xl leading-[inherit] shrink-0 cursor-pointer transition-colors duration-300 ease-[ease]
                    hover:border-highlight size-[2.8rem]">
                    <Icon name="lucide:fingerprint" />
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { loginSchema } from '~~/shared/schemas/auth'

const username = ref('')
const password = ref('')
const isView = ref(false)

const currentUser = useAuthUser()

const { openToast } = useToast()

const handleLogin = async () => {
    const result = loginSchema.safeParse({
        username: username.value,
        password: password.value
    })

    if (!result.success) {
        openToast(result.error.issues[0]?.message || 'Geçersiz bilgiler.', 'error')

        return
    }

    try {
        await $fetch('/api/auth/login', {
            method: 'POST',
            body: {
                username: username.value,
                password: password.value
            }
        })

        const user = await $fetch('/api/users/@me')

        currentUser.value = user

        openToast('Logged in successfully', 'success')

        await navigateTo('/home')
    } catch (e: any) {
        openToast(e.data?.message || e.message || 'Login failed', 'error')
    }
}
</script>
