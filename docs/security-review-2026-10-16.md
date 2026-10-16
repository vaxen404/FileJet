# FileJetV2 düzeltme raporu — 16 Ekim 2026

## Düzeltilenler

- Favori listesi yalnızca tek hedefi olan ve hedefi oturum sahibine ait kayıtları döndürür. Karışık hedefli eski kayıtların başka kullanıcıya ait dosya/not içeriğini sızdırması engellendi; fiziksel depolama anahtarı favori yanıtından çıkarıldı.
- Favori ekleme sahiplik kontrolü, tekrar kontrolü ve oluşturma aynı transaction içinde, kullanıcı satırı kilitliyken yapılır.
- Dosya/klasör/not yüklemeleri ile not güncellemeleri kotayı PostgreSQL `FOR UPDATE` kilidi altında kontrol edip günceller. Kota ve metadata birlikte commit/rollback olur. Aynı kilit klasör oluşturma ve yeniden adlandırma yarışlarını da önler.
- Dosya içeriği metadata transaction'ından önce yazılır ve diske flush edilir. Başarısız klasör/dosya yüklemesinde önceki yazımlar temizlenir. Commit sonucunun belirsiz olduğu durumda aynı yüklemenin transaction kilidi beklenir ve veritabanına geçmiş içerik korunur. Veritabanına ulaşılamazsa içerik ve kurtarma günlüğü tutulur.
- `open('wx')` başarısız olduğunda mevcut dosya silinmez. Yalnızca bu çağrının oluşturduğu dosya yazma/sync/close hatasında temizlenir. Fiziksel adlar kullanıcı dosya adından bağımsız UUID'lerdir.
- Boş not güncelleme, klasör yeniden adlandırma ve klasör indirme endpoint'leri tamamlandı. Klasör indirme, ek paket olmadan akış halinde **TAR** üretir; alt klasörleri, boş klasörleri ve notları içerir.
- Paylaşılan içeriğin sahibi paylaşımı oluşturan kullanıcıyla eşleştirilir; önizleme dosya yolu ve akış hataları kontrol edilir.
- Eski dosya önizleme/paylaşım oluşturma URL'leri ve not yüklemesinin `file`/`files` alan uyuşmazlığı düzeltildi. Klasör seçim API'si olmayan tarayıcılar için kontrol eklendi. İndirmeden önce HEAD kontrolü geri getirildi.
- Yanıtlardaki boyutlar string olarak serileştirilir; BigInt JSON hatası ve büyük sayılarda hassasiyet kaybı önlenir.
- `vue-tsc` ile uyumsuz TypeScript 7 yerine mevcut araçlarla çalışan TypeScript **5.9.3** sabitlendi. Nuxt ve Prisma sürümleri değiştirilmedi.

## Bu çalışmanın değiştirdiği dosyalar

Önceden var olan ve çalışma sırasında dışarıdan yapılan değişiklikler bu listeye dahil değildir.

| Alan | Dosyalar |
| --- | --- |
| Depolama | `server/utils/files.ts`, `storage.ts`, `uploads.ts`, `tar.ts`; `maintenance/recover-uploads.mjs` |
| Favoriler | `server/api/favorites/index.get.ts`, `index.post.ts` |
| Dosyalar | `server/api/files/index.get.ts`, `index.post.ts`, `[fileId]/index.get.ts`, `[fileId]/index.patch.ts`, `[fileId]/download.get.ts` |
| Klasörler | `server/api/folders/index.post.ts`, `[folderId].patch.ts`, `[folderId]/download.get.ts` |
| Notlar | `server/api/notes/index.get.ts`, `index.post.ts`, `upload.post.ts`, `[noteId].patch.ts` |
| Paylaşım | `server/api/shared/[token]/index.get.ts`, `preview.get.ts`, `download.get.ts` |
| Frontend | `app/components/ui/ShareBox.vue`; `app/composables/actions/useFileActions.ts`, `useFolderActions.ts`, `useNotesActions.ts`; `app/pages/(user)/files/[id].vue` |
| Şema | `prisma/schema.prisma` içindeki favori unique tanımları ve klasör indeks açıklaması; `prisma/migrations/202610160001_integrity/migration.sql`, `migration_lock.toml` |
| Doğrulama | `tests/security-integrity.test.mjs`, `postgres-integrity.test.mjs`; mevcut `bulk-delete.test.mjs`, `file-clipboard.test.mjs`, `file-download.test.mjs` içindeki eski yollar/mock'lar |
| Yapılandırma | `.gitignore` (testlerin sürümlenebilmesi), `package.json`, `package-lock.json`; bu rapor |

**Silme endpoint'lerini veya Trash şemasını ben değiştirmedim.** Çalışma sırasında bu alanlarda eşzamanlı dış değişiklikler görüldü ve korundu. Mevcut bir arşiv tablosu dosyaya referans veriyorsa kurtarma yalnızca bunu okuyarak içeriği korur; silme davranışını değiştirmez.

## Doğrulama

- `npm test`: **59 başarılı, 0 başarısız, 1 atlanan**. PostgreSQL testi bu komutta bağlantı tanımlı olmadığı için atlandı; ayrı komutta çalıştırıldı.
- `npm run test:db`: **5/5 başarılı**. Yerel PostgreSQL'de geçici, benzersiz bir şemada 20 eşzamanlı kota isteği, metadata hatasında rollback, 12 eşzamanlı klasör oluşturma ve migration kısıtları doğrulandı. Test şeması sonunda kaldırılır; uygulama verisi değiştirilmez.
- `npm run typecheck`, `npm run build`, `prisma validate`, `prisma generate`: başarılı.
- İlk derleme sandbox'ın esbuild alt sürecini engellemesi nedeniyle `EPERM` verdi; izinli tekrar başarılı oldu. İlk TypeScript kontrolünün araç uyumsuzluğu düzeltildi.
- Derlenmiş Prisma istemcisiyle advisory lock, satır kilidindeki BigInt dönüşü ve `text[]` bağlama ayrıca doğrulandı; uygulama verisi değiştirilmedi.

## Migration ve kurtarma

Migration SQL'i test veritabanında doğrulandı; **uygulamanın mevcut veritabanına uygulanmadı**. Kök/alt klasör adlarına ve favori hedeflerine unique indeksler ekler. Eski kayıtları silmez/birleştirmez; tekrarlar varsa transaction başarısız olur. Yeni bozuk favorileri engelleyen CHECK, eski bozuk kayıtları otomatik düzeltmemek için `NOT VALID` eklenir.

Mevcut, migration geçmişi olmayan veritabanında SQL'i doğrudan uygulamak için:

```sh
npx prisma db execute --config prisma7.config.ts --file prisma/migrations/202610160001_integrity/migration.sql
```

Prisma Migrate ile yönetilecek mevcut veritabanı için önce mevcut şema baseline'ı hazırlanmalıdır; bu ek migration tek başına sıfırdan veritabanı kurmaz. Trash için çalışma sırasında eklenen dış şema değişiklikleri bu migration'ın kapsamında değildir.

Çökme sonrası yarım yüklemeleri kurtarmak için **aynı depolamaya yazan bütün FileJet sunucuları/worker'ları durdurulmalıdır**:

```sh
npm run storage:recover -- --offline
```

Komutu proje kökünden, sunucunun kullandığı aynı veritabanı ve kalıcı `storage` diziniyle çalıştırın. Komut yalnızca yeni yüklemelerin `.uploads` günlüklerinde kayıtlı ve veritabanınca referans verilmeyen dosyalarını temizler. Yaşa bakarak çalışan yüklemeleri silen otomatik bir görev eklenmedi. Bozuk günlükler otomatik silinmez. Günlük yazılmadan önceki çökmeler boş dizin bırakabilir; güç/disk kaybı için veritabanı ve dosya sistemi arasında tam atomiklik garanti edilmez.

## Hâlâ çözülmeyenler ve silme bulguları

- Salt okunur yerel denetimde **8 dosya kaydından 2'sinin fiziksel içeriği eksik**, **1 kullanıcının kotası dosya + not toplamıyla farklı** bulundu. İçeriği yeniden üretmek mümkün değil; veriler otomatik değiştirilmedi. Denetim sırasında klasör/favori tekrarı veya bozuk favori bulunmadı.
- `server/api/folders/bulk-delete.post.ts` ve `server/api/notes/bulk-delete.post.ts` boş. Silme kapsamı dışında bırakıldığı için tamamlanmadı.
- Favori kaldırma dosyası `[ItemType]` parametresi altında, handler ise `itemType` okuyor. Silme endpoint'i değiştirilmeme kuralı nedeniyle bırakıldı.
- Çalışma sırasında tek dosya silme dosyası dışarıdan `[fileId]/[fileId].delete.ts` konumuna taşındı. Bu `/api/files/:fileId/:fileId` yolunu üretir; frontend'in tek kimlikli DELETE URL'siyle uyumsuzdur. Bu dış değişikliğe müdahale edilmedi.
- Mevcut toplu dosya silmede fiziksel içerik DB transaction'ından önce kaldırılıyor; DB hatasında metadata kalabilir. Klasör silmede DB commit sonrası disk hataları yetim içerik bırakabilir. Alt ağacın önceden okunması ile silme arasında eşzamanlı yükleme/kota yarışları vardır. Silme kodları bu çalışmada değiştirilmedi.

## Trash tamamlanırken ele alınacaklar

- Mantıksal silme ve nihai fiziksel temizliği ayıran, tekrar denenebilir ve kalıcı işlem kaydı; çökme/DB/disk hatasından sonra kurtarma.
- Dosya, klasör alt ağacı ve notlar için aynı sahiplik ve kota kilidi; tekrarlı silme/geri yüklemede kotanın yalnızca bir kez değişmesi. Çöpün kotaya dahil olup olmadığı açıkça belirlenmeli.
- Geri yüklemede klasör ağacı, silinmiş ebeveynler, ad çakışmaları, sahiplik ve paylaşım/favori ilişkileri.
- Saklama süresi, kalıcı temizleme görevi, başarısız disk işlemlerinin yeniden denenmesi ve mevcut eksik dosya/kota tutarsızlıklarının denetimli onarımı.
