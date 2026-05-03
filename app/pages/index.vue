<script setup>
import { UserSchema } from '../utils/schemas'
import { useSystemStore } from '~/stores/system'

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

const authCookie = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 })

const login = async () => {
    const systemStore = useSystemStore()
    errorMsg.value = ''
    
    const result = UserSchema.safeParse({ username: username.value, password: password.value })
    if (!result.success) {
        errorMsg.value = 'Geçerli bilgiler giriniz.'
        return
    }

    loading.value = true
    try {
        await $fetch('/api/auth/login', {
            method: 'POST',
            body: { username: username.value, password: password.value }
        })
        
        localStorage.setItem('username', username.value)
        authCookie.value = 'token_123'
        systemStore.login(username.value)
        return navigateTo('/home')
    } catch (error) {
        errorMsg.value = 'Hatalı giriş!'
    } finally {
        loading.value = false
    }
}
</script>

<template>
    <div class="auth-container">
        <div class="auth-card">
            <div class="brand">
                <div class="brand-icon">F</div>
                <h2>Tekrar Hoş Geldin</h2>
                <p>Dosyalarına erişmek için giriş yap</p>
            </div>

            <div v-if="errorMsg" class="error-box">
                <span class="error-icon">⚠️</span>
                {{ errorMsg }}
            </div>

            <div class="form-body">
                <div class="input-group">
                    <label>Kullanıcı Adı</label>
                    <input 
                        v-model="username" 
                        type="text" 
                        placeholder="Kullanıcı adınızı yazın..."
                        :class="{ 'input-error': errorMsg }"
                        @keyup.enter="login"
                    >
                </div>

                <div class="input-group">
                    <label>Şifre</label>
                    <input 
                        v-model="password" 
                        type="password" 
                        placeholder="••••••••"
                        :class="{ 'input-error': errorMsg }"
                        @keyup.enter="login"
                    >
                </div>

                <button 
                    class="btn-main" 
                    :disabled="loading" 
                    @click="login"
                >
                    {{ loading ? 'Giriş Yapılıyor...' : 'Giriş Yap' }}
                </button>
            </div>
            
            <div class="footer">
                <span>Henüz hesabın yok mu?</span>
                <button class="btn-link" @click="navigateTo('/signup')">Kayıt Ol</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* CSS tamamen Signup sayfanla aynı, böylece geçişlerde ekran zıplamaz */
.auth-container {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0f12;
    color: #fff;
    font-family: 'Inter', sans-serif;
    margin: 0;
}

.auth-card {
    width: 100%;
    max-width: 400px;
    background: #16161a;
    padding: 40px;
    border-radius: 24px;
    border: 1px solid #232329;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.brand {
    text-align: center;
    margin-bottom: 30px;
}

.brand-icon {
    width: 48px;
    height: 48px;
    background: #6366f1;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 20px;
    margin: 0 auto 16px;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

h2 {
    font-size: 24px;
    margin-bottom: 8px;
    font-weight: 700;
}

p {
    color: #71717a;
    font-size: 14px;
}

.error-box {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #ef4444;
    padding: 14px;
    border-radius: 12px;
    font-size: 13px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.input-group {
    margin-bottom: 20px;
}

label {
    display: block;
    font-size: 13px;
    color: #a1a1aa;
    margin-bottom: 8px;
}

input {
    width: 100%;
    padding: 12px 16px;
    background: #0f0f12;
    border: 1px solid #232329;
    border-radius: 12px;
    color: #fff;
    font-size: 15px;
    box-sizing: border-box;
    transition: all 0.2s ease;
}

input:focus {
    outline: none;
    border-color: #6366f1;
    background: #111116;
}

.input-error {
    border-color: #ef4444 !important;
}

.btn-main {
    width: 100%;
    padding: 14px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 10px;
}

.btn-main:hover:not(:disabled) {
    background: #4f46e5;
    transform: translateY(-1px);
}

.btn-main:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.footer {
    margin-top: 30px;
    text-align: center;
    font-size: 14px;
    color: #71717a;
}

.btn-link {
    background: none;
    border: none;
    color: #6366f1;
    font-weight: 600;
    cursor: pointer;
    margin-left: 6px;
}

.btn-link:hover {
    text-decoration: underline;
}
</style>