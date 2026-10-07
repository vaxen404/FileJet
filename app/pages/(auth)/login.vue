<script setup lang="ts">
import { loginSchema } from '~/schemas/auth'

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
        openToast(
            result.error.issues[0]?.message || 'Geçersiz bilgiler.',
            'error'
        )

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
        openToast(
            e.data?.message || 'Login failed',
            'error'
        )
    }
}

</script>

<template>
    <div class="login-page">
        <div class="login-card">
            <h2>Login</h2>

            <div class="form-group">
                <label>Username<i>*</i></label>
                <input type="text" v-model="username">
            </div>
            
            <div class="form-group">
                <label>Password<i>*</i></label>
                <div class="input-box">
                    <input :type=" isView ? 'text' : 'password'" @keyup.enter="handleLogin"  v-model="password">
                    <button v-if="password.length > 0" @click="isView = !isView" class="password-icon">
                        <Icon 
                            :name=" isView ? 'lucide:eye' : 'lucide:eye-closed'"    
                        />
                    </button>
                </div>
            </div>

            <div class="login-actions">
                <button @click="handleLogin" class="login-btn">
                    <Icon name="lucide:lock" />
                    Login
                </button>

                <button class="auth-btn">
                    <Icon name="lucide:fingerprint" />
                </button>
            </div>
        </div>
    </div>
</template>

<style>
* {
    box-sizing: border-box;
}

body {
    padding: 0;
    margin: 0;
}
</style>

<style scoped>
    .login-page {
        width: 100%;
        min-height: 100dvh;
        background: #121214;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .login-card {
        width: 38rem;
        padding: 2rem;
        background: #1a1a1d;
        border: 1px solid #202025;
        border-radius: 1rem;
        display: flex;
        flex-direction: column;
    }

    .login-card h2 {
        font-family: Arial, Helvetica, sans-serif;
        font-size: 1.8rem;
        color: #f5f5f5;
        margin: 0 0 3.5rem 0;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        margin: 0 0 2rem 0;
        gap: 0.3rem;
    }

    .form-group label {
        display: block;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 0.875rem;
        font-weight: 500;
        color: #f1f1f1;
        text-transform: uppercase;
    }

    .form-group label i {
        color: #ff3b3b;
        font-style: normal;
        margin-left: 0.25rem;
    }

    .form-group input {
        width: 100%;
        font-size: 1rem;
        padding: 0.875rem;
        background: #252529;
        color: white;
        border: 1px solid #2f2f33;
        border-radius: 0.875rem;
        outline: none;
    }

    .form-group input:focus {
        border: 1px solid #5a5aff;
    }

    .input-box {
        position: relative;
        width: 100%;
    }

    .input-box input {
        padding-right: 3rem;
    }

    .password-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        right: 0.6rem;
        top: 50%;
        transform: translateY(-50%);
        width: 2rem;
        height: 2rem;
        font-size: 1.1rem;
        border: none;
        border-radius: 0.7rem;
        background: #232327;
        color: #f5f5f5;
        cursor: pointer;
        transition: 0.3s all ease;
    }

    .password-icon:hover {
        background: #29292e;
    }

    .login-actions {
        display: flex;
        flex-direction: row;
        gap: 0.75rem;
    }

    .login-btn {
        flex: 1;
        padding: 0.625rem;
        font-size: 1.1rem;
        background: #5a5aff;
        border-radius: 0.875rem;
        border: 1px solid #5a5aff;
        color: #ffffff;
        cursor: pointer;
        transition: 0.3s all ease;
    }

    .login-btn:hover {
        border-color: #f1f1f1;
    }

    .auth-btn {
        width: 2.8rem;
        height: 2.8rem;
        display: flex;
        justify-content: center;
        align-items: center;
        background: #2f2f33;
        color: #ffffff;
        border-radius: 1rem;
        border: 1px solid #2f2f33;
        font-size: 1.5rem;
        flex-shrink: 0;
        cursor: pointer;
        transition: 0.3s all ease;
    }

    .auth-btn:hover {
        border-color: #5a5aff;
    }
</style>
