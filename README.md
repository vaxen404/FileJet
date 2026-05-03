# ⚡ FileJet

FileJet, Nuxt 3 altyapısı üzerinde geliştirilmiş; güvenlik, hız ve tip güvenliğini (type-safety) odağına alan profesyonel bir bulut yönetim ekosistemidir.

## 🛡️ Güvenlik ve Mimari

- Projenin kalbinde, verileri savunmasız bırakmayan modern mühendislik yaklaşımları yer alır:

- Argon2 Hashing: Kullanıcı şifreleri, endüstri standardı Argon2 algoritması ile sunucu tarafında asimetrik olarak korunur.

- Dual-Layer Middleware: Yetkilendirme süreçleri hem istemci (Client) hem de sunucu (Server) tarafında çift katmanlı bir koruma ile yönetilir.

- Zod Validation: Tüm I/O trafiği, Zod şemaları ile valide edilerek runtime hataları ve veri kirliliği önlenir.

## 🏗️ Teknik Katmanlar

- Sürdürülebilir bir geliştirme için modüler bir yapı tercih edilmiştir:

- Plugin System: Uygulama önyükleme sırasında global entegrasyonlar asenkron olarak ayağa kalkar.

- Pinia State: Uygulama durumu, atomik parçalara bölünmüş merkezi bir Source of Truth üzerinden yönetilir.

- Advanced Utils: Şifreleme mantığından dosya sistemi operasyonlarına kadar tüm "business logic" izole edilmiş utils katmanında barındırılır.

## 💻 Stack

- Frontend: Nuxt 3 (Vue 3 Composition API)

- Styling: Tailwind CSS

- State: Pinia

- Server: Nitro Engine

## 📂 Proje Yapısı

- app/ — UI, Middleware & Plugins

- server/ — API Routes & Argon2 Logic

- stores/ — Pinia State Management

- utils/ — Cross-platform Schemas & Helpers

## vaxen404 tarafından modern standartlarla geliştirildi.
