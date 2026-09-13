import { Persona } from "../types";

export const PERSONAS: Persona[] = [
  {
    id: "general",
    name: "Genel Asistan",
    role: "Her Konuda Uzman",
    description: "Sorularınızı yanıtlar, bilgi verir ve günlük görevlerinizde yardımcı olur.",
    icon: "Sparkles",
    systemInstruction:
      "Sen Türkçe konuşan, bilgili, kibar ve çok yönlü bir yapay zeka asistanısın. Yanıtlarını düzenli, anlaşılır ve Markdown formatında ver.",
  },
  {
    id: "developer",
    name: "Yazılım Mimarı",
    role: "Kod & Mimari Uzmanı",
    description: "Kod yazar, hata ayıklar, mimari tavsiyeleri verir ve algoritmalar tasarlar.",
    icon: "Code2",
    systemInstruction:
      "Sen kıdemli bir yazılım mimarısın. Kod standartları, temiz kod prensipleri ve performans odaklı çözümler sun. Kod örneklerini her zaman uygun dille markdown kod bloklarında ver.",
  },
  {
    id: "writer",
    name: "Yaratıcı Yazar",
    role: "Metin & İçerik Stratejisti",
    description: "Etkileyici makaleler, hikayeler, e-postalar ve reklam metinleri üretir.",
    icon: "Feather",
    systemInstruction:
      "Sen usta bir metin yazarı ve editörsün. Zengin kelime dağarcığı, akıcı bir üslup ve dikkat çekici anlatımla içerikler oluştur.",
  },
  {
    id: "analyst",
    name: "Veri & Mantık Analisti",
    role: "Eleştirel Düşünür",
    description: "Karmaşık verileri, matematiksel problemleri ve stratejileri analiz eder.",
    icon: "BarChart3",
    systemInstruction:
      "Sen analitik düşünen bir veri ve strateji uzmanısın. Maddeler halinde, mantıksal sıralamayla ve kanıta dayalı analizler sun.",
  },
  {
    id: "teacher",
    name: "Akademik Eğitmen",
    role: "Pedagojik Rehber",
    description: "Zor kavramları basitleştirir, adım adım öğretir ve örnekler sunar.",
    icon: "GraduationCap",
    systemInstruction:
      "Sen sabırlı ve bilge bir eğitmensin. En karmaşık konuları bile '5 yaşındaki birine anlatır gibi' veya 'adım adım metodolojiyle' netleştir.",
  },
];

export const STARTER_PROMPTS = [
  "🚀 Bir yapay zeka startup'ı için büyüme stratejisi hazırla",
  "💻 React ve TypeScript ile custom hook mimarisi nasıl kurulur?",
  "📝 Profesyonel bir iş teklifi kabul e-postası taslağı yaz",
  "🧠 Kuantum bilgisayarların çalışma prensibini benzetmelerle açıkla",
];

export const CONTENT_TEMPLATES = [
  { id: "blog", name: "Blog / Makale Yazısı", icon: "BookOpen" },
  { id: "linkedin", name: "LinkedIn Gönderisi", icon: "Linkedin" },
  { id: "email", name: "İş & Satış E-Postası", icon: "Mail" },
  { id: "instagram", name: "Instagram / Sosyal Medya", icon: "Share2" },
  { id: "product", name: "Ürün Tanıtım Metni", icon: "ShoppingBag" },
  { id: "press", name: "Basın Bülteni", icon: "Newspaper" },
];

export const TONE_OPTIONS = [
  "Profesyonel & Kurumsal",
  "Samimi & Doğal",
  "İkna Edici & Satış Odaklı",
  "Eğitici & Akademik",
  "Heyecan Verici & İlham Verici",
  "Mizahi & Eğlenceli",
];

export const CODE_ACTIONS = [
  { id: "write", label: "Kod Yaz / Geliştir", desc: "İstediğiniz özelliği sıfırdan kodlayın" },
  { id: "debug", label: "Hata Ayıkla & Çöz", desc: "Hatalı kodu inceleyin ve düzeltilmiş halini alın" },
  { id: "explain", label: "Kodu Satır Satır Açıkla", desc: "Kodun mantığını ve çalışma şeklini öğrenin" },
  { id: "optimize", label: "Performansı Optimize Et", desc: "Daha hızlı ve temiz bir versiyona dönüştürün" },
  { id: "convert", label: "Dilden Dile Çevir", desc: "Örn: Python kodunu TypeScript'e çevirin" },
];

export const LANGUAGES = [
  "TypeScript",
  "JavaScript",
  "Python",
  "SQL",
  "C#",
  "Java",
  "Go",
  "Rust",
  "HTML / Tailwind CSS",
  "C++",
  "PHP",
];
