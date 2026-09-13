import { AppPermissionsConfig } from "../types";

export const DEFAULT_PERMISSIONS: AppPermissionsConfig = {
  phoneCalls: true,
  youtube: true,
  instagram: true,
  twitter: true,
  whatsapp: true,
  spotify: true,
  googleMaps: true,
  webSearch: true,
  wakeWordEnabled: true,
  ambientModeWakeLock: true,
  requireConfirmation: false,
};

export interface VoiceCommandResult {
  isCommand: boolean;
  appName?: string;
  actionDescription?: string;
  url?: string;
  permitted: boolean;
  permissionKey?: keyof AppPermissionsConfig;
  spokenReply?: string;
}

/**
 * Checks speech text for app opening, calling, or media intents.
 */
export function parseVoiceCommand(
  rawTranscript: string,
  permissions: AppPermissionsConfig
): VoiceCommandResult {
  const text = rawTranscript.trim().toLowerCase();

  // 1. YouTube Intent
  if (
    text.includes("youtube") ||
    text.includes("yu tub") ||
    text.includes("yutub") ||
    text.includes("video aç")
  ) {
    if (!permissions.youtube) {
      return {
        isCommand: true,
        appName: "YouTube",
        permitted: false,
        permissionKey: "youtube",
        spokenReply: "YouTube izni ayarlardan devre dışı bırakılmış.",
      };
    }

    // Extract search query if user said: "youtube'da ... aç / ara"
    let query = "";
    const ytMatch = text.match(
      /(?:youtube(?:'da|'de|da|de)?\s+)(.*?)(?:\s+(?:aç|çal|ara|izle|bul))?$/i
    );
    if (ytMatch && ytMatch[1] && !ytMatch[1].includes("aç")) {
      query = ytMatch[1].trim();
    }

    const url = query
      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
      : "https://www.youtube.com";

    return {
      isCommand: true,
      appName: "YouTube",
      actionDescription: query ? `YouTube'da "${query}" aranıyor` : "YouTube açılıyor",
      url,
      permitted: true,
      permissionKey: "youtube",
      spokenReply: query ? `YouTube'da ${query} açılıyor.` : "YouTube açılıyor.",
    };
  }

  // 2. Phone Call Intent
  const callMatch = text.match(
    /(?:telefonla\s+)?(?:ara|arama\s+yap|telefon\s+et)\s*(.*)|(.*)\s*(?:'i|'ı|'u|'ü|i|ı|u|ü)?\s*ara$/i
  );
  if (
    (text.includes("ara") || text.includes("telefon et") || text.includes("arama yap")) &&
    !text.includes("google") &&
    !text.includes("internette") &&
    !text.includes("youtube") &&
    !text.includes("araştır")
  ) {
    if (!permissions.phoneCalls) {
      return {
        isCommand: true,
        appName: "Telefon",
        permitted: false,
        permissionKey: "phoneCalls",
        spokenReply: "Telefon arama izni ayarlardan kapalı.",
      };
    }

    // Check if there is a number
    const numberMatch = text.match(/(\+?\d[\d\s-]{6,}\d)/);
    const target = numberMatch ? numberMatch[1].replace(/[\s-]/g, "") : "";

    return {
      isCommand: true,
      appName: "Telefon Arama",
      actionDescription: target ? `${target} aranıyor` : "Telefon arama ekranı açılıyor",
      url: target ? `tel:${target}` : "tel:",
      permitted: true,
      permissionKey: "phoneCalls",
      spokenReply: target ? `${target} aranıyor.` : "Telefon arama başlatılıyor.",
    };
  }

  // 3. Instagram Intent
  if (text.includes("instagram") || text.includes("insta")) {
    if (!permissions.instagram) {
      return {
        isCommand: true,
        appName: "Instagram",
        permitted: false,
        permissionKey: "instagram",
        spokenReply: "Instagram izni kapalı.",
      };
    }
    return {
      isCommand: true,
      appName: "Instagram",
      actionDescription: "Instagram açılıyor",
      url: "https://www.instagram.com",
      permitted: true,
      permissionKey: "instagram",
      spokenReply: "Instagram açılıyor.",
    };
  }

  // 4. Twitter / X Intent
  if (text.includes("twitter") || text.includes("x'i aç") || text.includes("x aç")) {
    if (!permissions.twitter) {
      return {
        isCommand: true,
        appName: "X (Twitter)",
        permitted: false,
        permissionKey: "twitter",
        spokenReply: "X (Twitter) izni kapalı.",
      };
    }
    return {
      isCommand: true,
      appName: "X (Twitter)",
      actionDescription: "X açılıyor",
      url: "https://x.com",
      permitted: true,
      permissionKey: "twitter",
      spokenReply: "X açılıyor.",
    };
  }

  // 5. WhatsApp Intent
  if (text.includes("whatsapp") || text.includes("vatsap") || text.includes("vatşap")) {
    if (!permissions.whatsapp) {
      return {
        isCommand: true,
        appName: "WhatsApp",
        permitted: false,
        permissionKey: "whatsapp",
        spokenReply: "WhatsApp izni kapalı.",
      };
    }
    return {
      isCommand: true,
      appName: "WhatsApp",
      actionDescription: "WhatsApp açılıyor",
      url: "https://web.whatsapp.com",
      permitted: true,
      permissionKey: "whatsapp",
      spokenReply: "WhatsApp açılıyor.",
    };
  }

  // 6. Spotify / Music Intent
  if (text.includes("spotify") || text.includes("müzik aç") || text.includes("şarkı aç")) {
    if (!permissions.spotify) {
      return {
        isCommand: true,
        appName: "Spotify",
        permitted: false,
        permissionKey: "spotify",
        spokenReply: "Spotify müzik izni kapalı.",
      };
    }
    return {
      isCommand: true,
      appName: "Spotify",
      actionDescription: "Spotify açılıyor",
      url: "https://open.spotify.com",
      permitted: true,
      permissionKey: "spotify",
      spokenReply: "Spotify açılıyor.",
    };
  }

  // 7. Google Maps / Navigation Intent
  if (
    text.includes("harita") ||
    text.includes("navigasyon") ||
    text.includes("yol tarifi") ||
    text.includes("nasıl gidilir")
  ) {
    if (!permissions.googleMaps) {
      return {
        isCommand: true,
        appName: "Google Haritalar",
        permitted: false,
        permissionKey: "googleMaps",
        spokenReply: "Haritalar izni kapalı.",
      };
    }
    const cleanQuery = text
      .replace(/harita(?:ları|yı)?\s+aç/i, "")
      .replace(/navigasyon(?:u)?\s+aç/i, "")
      .trim();

    return {
      isCommand: true,
      appName: "Google Haritalar",
      actionDescription: cleanQuery
        ? `"${cleanQuery}" için Haritalar açılıyor`
        : "Haritalar açılıyor",
      url: cleanQuery
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanQuery)}`
        : "https://www.google.com/maps",
      permitted: true,
      permissionKey: "googleMaps",
      spokenReply: "Haritalar açılıyor.",
    };
  }

  // 8. Web Search Intent
  if (
    text.startsWith("google'da ara") ||
    text.startsWith("internette ara") ||
    text.startsWith("webde ara")
  ) {
    if (!permissions.webSearch) {
      return {
        isCommand: true,
        appName: "Web Arama",
        permitted: false,
        permissionKey: "webSearch",
        spokenReply: "Web arama izni kapalı.",
      };
    }
    const searchQuery = text
      .replace(/^(google'da ara|internette ara|webde ara)\s*/i, "")
      .trim();

    return {
      isCommand: true,
      appName: "Google Arama",
      actionDescription: `"${searchQuery}" aranıyor`,
      url: `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
      permitted: true,
      permissionKey: "webSearch",
      spokenReply: `${searchQuery} aranıyor.`,
    };
  }

  // Not a predefined system command -> Treat as AI prompt
  return {
    isCommand: false,
    permitted: true,
  };
}

/**
 * Checks if transcript contains wake words like "Hey Tulpar", "Tulpar", "Asistan"
 */
export function hasWakeWord(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return (
    lower.includes("hey tulpar") ||
    lower.includes("tulpar") ||
    lower.includes("ey tulpar") ||
    lower.includes("asistan")
  );
}

/**
 * Strips the wake word from transcript so the actual prompt can be processed
 */
export function stripWakeWord(transcript: string): string {
  return transcript
    .replace(/\b(hey\s+tulpar|ey\s+tulpar|tulpar|asistan)\b/gi, "")
    .trim();
}

/**
 * Executes the app launch or URL opening, optimized for Android and mobile browsers
 */
export function executeAppLaunch(url: string): void {
  try {
    // Phone calls on Android & iOS must use window.location.href
    if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:")) {
      window.location.href = url;
      return;
    }

    // Android-friendly link click pattern to bypass popup blocker limitations
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
    }, 200);
  } catch (err) {
    console.error("Failed to open app URL on Android:", err);
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.location.href = url;
    }
  }
}
