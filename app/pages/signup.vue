<script setup>
import { UserSchema } from '../utils/schemas'

const username = ref('')
const password = ref('')
const errorMsg = ref('')
const loading = ref(false)

const register = async () => {
    errorMsg.value = ''
    
    const result = UserSchema.safeParse({
        username: username.value,
        password: password.value
    })

    if (!result.success) {
        errorMsg.value = result.error?.issues?.[0]?.message || 'Giriş bilgileriniz geçersiz'
        return
    }

    loading.value = true
    try {
        await $fetch('/api/auth/register', {
            method: 'POST',
            body: result.data 
        })
        navigateTo('/')
    } catch (error) {
        errorMsg.value = error.statusMessage || 'Kayıt başarısız!'
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
                <h2>FileJet'e Katıl</h2>
                <p>Hızlı ve güvenli dosya saklama</p>
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
                        placeholder="En az 3 karakter..."
                        :class="{ 'input-error': errorMsg && username.length < 3 }"
                    >
                </div>

                <div class="input-group">
                    <label>Şifre</label>
                    <input 
                        v-model="password" 
                        type="password" 
                        placeholder="••••••••"
                        :class="{ 'input-error': errorMsg && password.length < 6 }"
                    >
                </div>

                <button 
                    class="btn-main" 
                    :disabled="loading" 
                    @click="register"
                >
                    {{ loading ? 'Bekleyin...' : 'Hesap Oluştur' }}
                </button>
            </div>
            
            <div class="footer">
                <span>Zaten üye misin?</span>
                <button class="btn-link" @click="navigateTo('/')">Giriş Yap</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.auth-container {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0f0f12;
    color: #fff;
    font-family: sans-serif;
    margin: 0;
}

.auth-card {
    width: 100%;
    max-width: 400px;
    background: #16161a;
    padding: 40px;
    border-radius: 20px;
    border: 1px solid #232329;
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
}

h2 {
    font-size: 24px;
    margin-bottom: 8px;
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
    border-radius: 10px;
    font-size: 14px;
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
    border-radius: 10px;
    color: #fff;
    font-size: 15px;
    box-sizing: border-box;
}

input:focus {
    outline: none;
    border-color: #6366f1;
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
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
}

.btn-main:disabled {
    opacity: 0.5;
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
</style>