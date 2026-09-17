# Tulpar — GitHub APK build paketi

Bu ZIP, mevcut güncel React/Vite Tulpar kaynaklarını temel alır ve GitHub Actions ile
Capacitor üzerinden Android debug APK üretmek için gerekli yapılandırmayı içerir.

## Nasıl kullanılır?
ZIP'i açıp içindeki TÜM dosyaları GitHub'daki `tulpar-apk` deposunun köküne yükleyin.
Ardından GitHub → Actions → **Tulpar APK Oluştur** → **Run workflow**.

Başarılı derlemeden sonra **Tulpar-debug-apk** artifact'ini indirin ve içindeki
`app-debug.apk` dosyasını telefona kurun.

## Önemli
Bu paket React yapısını korur. `server.ts` Android içinde Node sunucusu olarak çalışmaz.
Bu nedenle APK'nın `/api/...` çağrıları için erişilebilir bir HTTPS backend gerekir.
Backend yayınlanmadan APK kurulabilir ve arayüz açılabilir; ancak sunucuya bağlı AI
işlevleri çalışmayabilir.

API anahtarlarını APK/frontend içine gömmeyin.
