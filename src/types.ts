export type TabType = "chat" | "vision" | "content" | "code" | "quick";

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  systemInstruction: string;
}

export interface ContentGenerationParams {
  type: string;
  topic: string;
  tone: string;
  audience: string;
  length: string;
  additionalInfo: string;
}

export interface CodeGenerationParams {
  action: string;
  language: string;
  code: string;
  prompt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: {
    data: string;
    mimeType: string;
    name?: string;
  };
  timestamp: string | Date;
  isError?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  model: string;
}

export interface ModelConfig {
  id: string;
  name: string;
  badge: string;
  description: string;
  isDefault?: boolean;
}

export interface AppPermissionsConfig {
  phoneCalls: boolean;
  youtube: boolean;
  instagram: boolean;
  twitter: boolean;
  whatsapp: boolean;
  spotify: boolean;
  googleMaps: boolean;
  webSearch: boolean;
  wakeWordEnabled: boolean;
  ambientModeWakeLock: boolean;
  requireConfirmation: boolean;
}
