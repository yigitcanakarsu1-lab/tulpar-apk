import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  Phone,
  Youtube,
  Instagram,
  Twitter,
  MessageCircle,
  Music,
  MapPin,
  Search,
  Sparkles,
  Info,
  Sun,
  Lock,
  ExternalLink,
  Check,
  Smartphone,
} from "lucide-react";
import { AppPermissionsConfig } from "../types";
import { TulparLogo } from "./TulparLogo";

interface VoicePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: AppPermissionsConfig;
  onUpdatePermissions: (newPermissions: AppPermissionsConfig) => void;
  onOpenAmbientMode: () => void;
}

export const VoicePermissionModal: React.FC<VoicePermissionModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onUpdatePermissions,
  onOpenAmbientMode,
}) => {
  const [showAndroidGuide, setShowAndroidGuide] = useState(true);
  const [showSiriGuide, setShowSiriGuide] = useState(false);

  if (!isOpen) return null;

  const toggle = (key: keyof AppPermissionsConfig) => {
    onUpdatePermissions({
      ...permissions,
      [key]: !permissions[key],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-neutral-200/80">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white p-1.5 shadow-sm">
              <TulparLogo size={24} variant="white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-1.5">
                Sesli Komut & İzin Merkezi
              </h2>
              <p className="text-xs text-neutral-500">
                Siri benzeri sesli çağrı ve izinli uygulama kontrolü
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* OS Ekran Kısıtlaması & Çözüm Kartı */}
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs leading-relaxed text-amber-950">
                <p className="font-semibold text-amber-900 text-sm">
                  Ekran Kapalıyken Sesle Çağırma Hakkında
                </p>
                <p>
                  iOS ve Android tarayıcı güvenlik ilkeleri nedeniyle telefonun kilit tuşuna basılıp ekran tamamen kapandığında web mikrofon erişimi durdurulur.
                </p>
                <p>
                  <strong>Çözüm:</strong> Tulpar'ın <strong>"Ambiyans Always-On Modu"</strong> ekranı minimum OLED siyahında uyanık tutarak masada veya arabada sürekli <em>"Hey Tulpar"</em> sesinizi dinler!
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenAmbientMode();
              }}
              className="w-full mt-1 flex items-center justify-center gap-2 rounded-xl bg-black py-2.5 px-4 text-xs font-semibold text-white shadow hover:bg-neutral-800 active:scale-98 transition-all"
            >
              <Sun className="h-4 w-4 text-amber-400" />
              Ambiyans Always-On Siri Ekranını Başlat
            </button>
          </div>

          {/* İzin Verilen Uygulamalar Bölümü */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                İzin Verilen Uygulamalar ve Eylemler
              </h3>
              <span className="text-[11px] text-neutral-400">
                Sesle Açılabilir
              </span>
            </div>

            <div className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white overflow-hidden">
              {/* 1. Telefon Arama */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Telefon ile Arama Yapma
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "Ahmet'i ara", "0532... ara"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.phoneCalls}
                  onChange={() => toggle("phoneCalls")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 2. YouTube */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <Youtube className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      YouTube Video & Müzik
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "YouTube'da Barış Manço aç", "YouTube aç"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.youtube}
                  onChange={() => toggle("youtube")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 3. Instagram */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                    <Instagram className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Instagram
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "Instagram'ı aç"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.instagram}
                  onChange={() => toggle("instagram")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 4. Twitter / X */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-100 text-neutral-800">
                    <Twitter className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      X (Twitter)
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "Twitter aç", "X'i aç"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.twitter}
                  onChange={() => toggle("twitter")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 5. WhatsApp */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50 text-green-600">
                    <MessageCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      WhatsApp
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "WhatsApp'ı aç"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.whatsapp}
                  onChange={() => toggle("whatsapp")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 6. Spotify */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Music className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Spotify / Müzik
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "Müzik aç", "Spotify aç"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.spotify}
                  onChange={() => toggle("spotify")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 7. Google Maps */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Google Haritalar
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "Kadıköy'e nasıl gidilir", "Haritayı aç"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.googleMaps}
                  onChange={() => toggle("googleMaps")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>

              {/* 8. Web Search */}
              <div className="flex items-center justify-between p-3.5 hover:bg-neutral-50/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Web & Google Arama
                    </p>
                    <p className="text-xs text-neutral-500">
                      Örnek: "Google'da ara hava durumu"
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.webSearch}
                  onChange={() => toggle("webSearch")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Asistan & Uyandırma Seçenekleri */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Siri & Wake Word Ayarları
            </h3>

            <div className="space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-3.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">
                    "Hey Tulpar" Uyandırma Kelimesi (Wake Word)
                  </p>
                  <p className="text-xs text-neutral-500">
                    Sesli asistan modundayken "Hey Tulpar" dendiğinde otomatik algılar
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.wakeWordEnabled}
                  onChange={() => toggle("wakeWordEnabled")}
                  className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                />
              </label>

              <div className="border-t border-neutral-200/60 pt-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      Ekranı Uyanık Tut (Screen Wake Lock)
                    </p>
                    <p className="text-xs text-neutral-500">
                      Cihazın uyku moduna geçmesini engelleyerek sürekli dinlemede tutar
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions.ambientModeWakeLock}
                    onChange={() => toggle("ambientModeWakeLock")}
                    className="h-5 w-5 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Android Telefon & Google Asistan Rehberi */}
          <div className="rounded-2xl border border-neutral-200 p-3.5 bg-neutral-50/50">
            <button
              onClick={() => setShowAndroidGuide(!showAndroidGuide)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-neutral-800">
                  Android Telefonda En İyi Deneyim (Google Asistan & PWA)
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-medium">
                {showAndroidGuide ? "Gizle" : "Gör"}
              </span>
            </button>

            {showAndroidGuide && (
              <div className="mt-3 pt-3 border-t border-neutral-200/60 text-xs text-neutral-600 space-y-2.5">
                <div className="rounded-xl bg-white p-2.5 border border-neutral-200/70 space-y-1">
                  <p className="font-semibold text-neutral-900">
                    1. Ana Ekrana Ekleme (Yerel APK Deneyimi):
                  </p>
                  <p className="text-neutral-600">
                    Android Chrome'da sağ üstteki <strong>üç nokta (⋮)</strong> menüsüne dokunun ve <strong>"Ana Ekrana Ekle"</strong> veya <strong>"Uygulamayı Yükle"</strong> seçeneğini seçin. Tulpar, telefonunuza tam ekran bir Android uygulaması olarak kurulur.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-neutral-200/70 space-y-1">
                  <p className="font-semibold text-neutral-900">
                    2. Ekran Kapalıyken Sesle Uyandırma:
                  </p>
                  <p className="text-neutral-600">
                    Android telefonunuz masadayken veya araçtayken üst barda bulunan <strong>Güneş</strong> simgesiyle <strong>Always-On Modunu</strong> açın. Ekranınız minimum OLED siyahında uyanık kalarak <em>"Hey Tulpar"</em> sesinizi 7/24 dinler.
                  </p>
                </div>

                <div className="rounded-xl bg-white p-2.5 border border-neutral-200/70 space-y-1">
                  <p className="font-semibold text-neutral-900">
                    3. Google Asistan Entegrasyonu:
                  </p>
                  <p className="text-neutral-600">
                    Telefonunuz kilitliyken bile <em>"Hey Google, Tulpar'ı aç"</em> diyerek Tulpar uygulamasını doğrudan ekrana getirebilirsiniz.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* iOS Siri Kestirmeler Rehberi Açılır Kartı */}
          <div className="rounded-2xl border border-neutral-200 p-3.5 bg-white">
            <button
              onClick={() => setShowSiriGuide(!showSiriGuide)}
              className="flex w-full items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-neutral-600" />
                <span className="text-xs font-semibold text-neutral-800">
                  iPhone'da "Hey Siri, Tulpar'ı Aç" Entegrasyonu
                </span>
              </div>
              <span className="text-xs text-neutral-400 font-medium">
                {showSiriGuide ? "Gizle" : "Gör"}
              </span>
            </button>

            {showSiriGuide && (
              <div className="mt-3 pt-3 border-t border-neutral-100 text-xs text-neutral-600 space-y-2">
                <p>
                  iPhone'unuz kilitliyken Siri'ye doğrudan Tulpar'ı açtırmak için:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-neutral-700">
                  <li>iPhone'da <strong>Kestirmeler (Shortcuts)</strong> uygulamasını açın.</li>
                  <li>Yeni bir kestirme oluşturup adını <strong>"Tulpar"</strong> yapın.</li>
                  <li><strong>"URL Aç"</strong> eylemini ekleyip Tulpar web adresini yapıştırın.</li>
                  <li>
                    Artık ekran kapalıyken bile <em>"Hey Siri, Tulpar"</em> dediğinizde telefonunuz Tulpar'ı doğrudan ekrana getirecektir!
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-100 px-6 py-4 bg-neutral-50 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            Değişiklikler anında kaydedilir.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl bg-black px-5 py-2 text-xs font-semibold text-white shadow hover:bg-neutral-800 active:scale-98 transition-all"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
