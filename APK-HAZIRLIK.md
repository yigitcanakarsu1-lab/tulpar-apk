# Tulpar APK hazırlığı

Bu paket mevcut React/TypeScript Tulpar projesini değiştirmeden Android paketlemeye hazırlamak için oluşturuldu.

## Önemli
- React yapısı korunmuştur.
- Mevcut `server.ts` backend'i kaldırılmamıştır.
- `capacitor.config.json` eklenmiştir.
- APK oluşturmak için Android/Capacitor bağımlılıklarının kurulması ve Android projesinin oluşturulması gerekir.
- API anahtarlarını APK içine gömmeyin; mevcut backend üzerinden güvenli şekilde kullanın.

## Sonraki adım
Proje kökünde:
1. `npm install`
2. `npm run build`
3. Capacitor Android projesini oluşturma/senkronizasyon
4. Android Studio veya uyumlu bir CI ortamında APK build

Not: Bu paket henüz `.apk` dosyası değildir.
