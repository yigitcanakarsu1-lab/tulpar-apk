# Tulpar APK

Bu proje mevcut React/Vite Tulpar uygulamasını Android WebView içine paketler.

## GitHub Actions ile APK
1. Projeyi GitHub'a yükleyin.
2. Repository > Actions > Build Tulpar APK > Run workflow.
3. İşlem tamamlanınca workflow run içinden `Tulpar-debug-apk` artifact'ini indirin.
4. ZIP'i açın; içindeki `app-debug.apk` dosyasını telefona kurun.

Not: Uygulamanın `/api/...` çağrıları için backend'in erişilebilir bir HTTPS adresinde çalışması gerekir. Bu APK, web arayüzünü Android içine paketler; server.ts kendiliğinden Android içinde Node sunucusu olarak çalışmaz.
