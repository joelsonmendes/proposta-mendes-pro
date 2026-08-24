"use client";

import {
  ChangeEvent,
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ItemCategory = "material" | "servico" | "outro";
type ProposalStatus = "rascunho" | "enviada" | "aprovada";

type BrandPalette = {
  primary: string;
  dark: string;
  accent: string;
  soft: string;
  onDark: string;
};

type LineItem = {
  id: string;
  category: ItemCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

type Proposal = {
  id: string;
  number: string;
  status: ProposalStatus;
  issueDate: string;
  validUntil: string;
  title: string;
  client: {
    company: string;
    contact: string;
    document: string;
    phone: string;
    email: string;
    address: string;
    logo: string;
  };
  issuer: {
    name: string;
    role: string;
    phone: string;
    email: string;
    document: string;
    logo: string;
  };
  objective: string;
  scope: string;
  deliverables: string;
  paymentTerms: string;
  deadline: string;
  warranty: string;
  notes: string;
  items: LineItem[];
  discountType: "percent" | "fixed";
  discountValue: number;
  extraCosts: number;
  signature: string;
  updatedAt: string;
};

type AppState = {
  proposals: Proposal[];
  currentId: string;
  sequence: number;
  professionalLogo: string;
  brandPalette: BrandPalette | null;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

const STORAGE_KEY = "proposta-mendes-pro-v1";
const THEME_KEY = "proposta-mendes-theme";
const DEFAULT_BRAND_PALETTE: BrandPalette = {
  primary: "#00aeef",
  dark: "#101820",
  accent: "#007fad",
  soft: "#e9f8fd",
  onDark: "#ffffff",
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
}

function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function proposalNumber(sequence: number) {
  return "JM-" + new Date().getFullYear() + "-" + String(sequence).padStart(4, "0");
}

function emptyItem(): LineItem {
  return {
    id: uid(),
    category: "servico",
    description: "Serviço técnico especializado",
    quantity: 1,
    unit: "serviço",
    unitPrice: 0,
  };
}

function makeProposal(sequence: number): Proposal {
  return {
    id: uid(),
    number: proposalNumber(sequence),
    status: "rascunho",
    issueDate: isoDate(),
    validUntil: addDays(15),
    title: "Proposta Comercial",
    client: {
      company: "",
      contact: "",
      document: "",
      phone: "",
      email: "",
      address: "",
      logo: "",
    },
    issuer: {
      name: "Joelson M. Mendes",
      role: "Especialista em Energia, IoT e Indústria 4.0",
      phone: "",
      email: "",
      document: "",
      logo: "",
    },
    objective: "Apresentar uma solução técnica segura, eficiente e adequada às necessidades do cliente.",
    scope: "Levantamento técnico\nExecução dos serviços conforme especificações\nTestes e entrega técnica",
    deliverables: "Documentação técnica e orientação de uso.",
    paymentTerms: "50% na aprovação e 50% na entrega.",
    deadline: "A combinar após a aprovação da proposta.",
    warranty: "90 dias para os serviços executados.",
    notes: "Materiais ou serviços não descritos nesta proposta serão orçados separadamente.",
    items: [emptyItem()],
    discountType: "percent",
    discountValue: 0,
    extraCosts: 0,
    signature: "",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeProposal(raw: Partial<Proposal>, sequence: number): Proposal {
  const base = makeProposal(sequence);
  return {
    ...base,
    ...raw,
    client: { ...base.client, ...(raw.client || {}) },
    issuer: { ...base.issuer, ...(raw.issuer || {}) },
    items: Array.isArray(raw.items) && raw.items.length ? raw.items : base.items,
  };
}

const templates = [
  {
    name: "Serviço técnico",
    title: "Proposta de Serviço Técnico",
    objective: "Executar serviço técnico especializado com segurança, qualidade e rastreabilidade.",
    scope: "Levantamento e diagnóstico técnico\nExecução do serviço\nTestes funcionais e entrega",
    deliverables: "Relatório simplificado, registros dos testes e orientação técnica.",
    items: [{ category: "servico" as ItemCategory, description: "Serviço técnico especializado", quantity: 1, unit: "serviço", unitPrice: 0 }],
  },
  {
    name: "Quadro elétrico",
    title: "Montagem de Quadro Elétrico",
    objective: "Fornecer a montagem de um quadro elétrico com organização, segurança e identificação profissional.",
    scope: "Montagem dos componentes\nConfecção, furação e acabamento dos barramentos\nIdentificação dos circuitos\nTestes e montagem final",
    deliverables: "Quadro montado, identificado, testado e pronto para instalação.",
    items: [
      { category: "material" as ItemCategory, description: "Materiais e componentes elétricos", quantity: 1, unit: "conjunto", unitPrice: 0 },
      { category: "servico" as ItemCategory, description: "Mão de obra de montagem e testes", quantity: 1, unit: "serviço", unitPrice: 0 },
    ],
  },
  {
    name: "Retrofit industrial",
    title: "Retrofit e Modernização Industrial",
    objective: "Modernizar o sistema de acionamento e controle, aumentando a confiabilidade, a precisão, a segurança e a facilidade de manutenção.",
    scope: "Levantamento do sistema existente\nReorganização do quadro elétrico\nProgramação e parametrização\nIntegração dos dispositivos\nTestes e comissionamento",
    deliverables: "Programas, parâmetros, treinamento operacional e suporte à partida.",
    items: [
      { category: "material" as ItemCategory, description: "Equipamentos e materiais para retrofit", quantity: 1, unit: "conjunto", unitPrice: 0 },
      { category: "servico" as ItemCategory, description: "Engenharia, programação e comissionamento", quantity: 1, unit: "serviço", unitPrice: 0 },
    ],
  },
  {
    name: "Sistema fotovoltaico",
    title: "Sistema Fotovoltaico",
    objective: "Implantar uma solução fotovoltaica dimensionada para reduzir o consumo de energia elétrica com segurança e desempenho.",
    scope: "Levantamento de consumo\nDimensionamento do sistema\nFornecimento e instalação\nProteções e aterramento\nComissionamento e monitoramento",
    deliverables: "Sistema instalado, testado, documentado e orientado ao cliente.",
    items: [
      { category: "material" as ItemCategory, description: "Kit fotovoltaico e materiais de instalação", quantity: 1, unit: "conjunto", unitPrice: 0 },
      { category: "servico" as ItemCategory, description: "Projeto, instalação e comissionamento", quantity: 1, unit: "serviço", unitPrice: 0 },
    ],
  },
];

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

function dateBR(value: string) {
  if (!value) return "—";
  const parts = value.split("-");
  return parts.length === 3 ? parts[2] + "/" + parts[1] + "/" + parts[0] : value;
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeSpeech(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function parseSpokenNumber(value?: string) {
  if (!value) return 0;
  const compact = value.trim().replace(/\s/g, "");
  if (/\d/.test(compact)) {
    const normalized = compact.includes(",")
      ? compact.replace(/\./g, "").replace(",", ".")
      : /^\d{1,3}(\.\d{3})+$/.test(compact)
        ? compact.replace(/\./g, "")
        : compact;
    return Number(normalized.replace(/[^\d.-]/g, "")) || 0;
  }

  const units: Record<string, number> = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
    seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
    treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16,
    dezassete: 17, dezessete: 17, dezoito: 18, dezenove: 19,
  };
  const tens: Record<string, number> = {
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  };
  const hundreds: Record<string, number> = {
    cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
    quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
  };
  const tokens = normalizeSpeech(value).split(/\s+/).filter((token) => token !== "e");
  let total = 0;
  let group = 0;
  tokens.forEach((token) => {
    if (token in units) group += units[token];
    else if (token in tens) group += tens[token];
    else if (token in hundreds) group += hundreds[token];
    else if (token === "mil") {
      total += (group || 1) * 1000;
      group = 0;
    } else if (token === "milhao" || token === "milhoes") {
      total += (group || 1) * 1000000;
      group = 0;
    }
  });
  return total + group;
}

function addDaysTo(start: string, days: number) {
  const date = start ? new Date(start + "T12:00:00") : new Date();
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function listFromSpeech(value: string) {
  return value
    .replace(/\s+(?:pr[oó]ximo item|novo item|novo t[oó]pico)\s+/gi, "\n")
    .replace(/\s+ponto e v[ií]rgula\s+/gi, "\n")
    .replace(/,\s+/g, "\n")
    .trim();
}

function spokenItem(text: string): LineItem {
  const quantityMatch = text.match(/quantidade\s+(.+?)(?=\s+valor|\s+categoria|\s+unidade|$)/i);
  const valueMatch = text.match(/valor(?:\s+unit[aá]rio)?\s+(?:de\s+)?(?:r\$\s*)?(.+?)(?=\s+reais|\s+categoria|\s+unidade|$)/i);
  const categoryMatch = text.match(/categoria\s+(material|servi[cç]o|outro)/i);
  const unitMatch = text.match(/unidade\s+([\p{L}\d.-]+)/iu);
  const description = text
    .replace(/(?:adicionar|incluir|criar)\s+(?:um\s+)?item\s*/i, "")
    .replace(/^item\s*/i, "")
    .replace(/quantidade\s+.+?(?=\s+valor|\s+categoria|\s+unidade|$)/i, "")
    .replace(/valor(?:\s+unit[aá]rio)?\s+(?:de\s+)?(?:r\$\s*)?.+?(?=\s+reais|\s+categoria|\s+unidade|$)(?:\s+reais)?/i, "")
    .replace(/categoria\s+(?:material|servi[cç]o|outro)/i, "")
    .replace(/unidade\s+[\p{L}\d.-]+/iu, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    ...emptyItem(),
    description: description || text,
    category: categoryMatch
      ? normalizeSpeech(categoryMatch[1]).startsWith("serv") ? "servico" : normalizeSpeech(categoryMatch[1]) as ItemCategory
      : "servico",
    quantity: quantityMatch ? parseSpokenNumber(quantityMatch[1]) : 1,
    unit: unitMatch ? unitMatch[1] : "serviço",
    unitPrice: valueMatch ? parseSpokenNumber(valueMatch[1]) : 0,
  };
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxWidth = 720;
        const maxHeight = 360;
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Canvas indisponível"));
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

type RgbColor = { r: number; g: number; b: number };

function channelLuminance(channel: number) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(color: RgbColor) {
  return 0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b);
}

function contrast(first: RgbColor, second: RgbColor) {
  const brightest = Math.max(luminance(first), luminance(second));
  const darkest = Math.min(luminance(first), luminance(second));
  return (brightest + 0.05) / (darkest + 0.05);
}

function mixColor(color: RgbColor, target: RgbColor, amount: number): RgbColor {
  return {
    r: Math.round(color.r + (target.r - color.r) * amount),
    g: Math.round(color.g + (target.g - color.g) * amount),
    b: Math.round(color.b + (target.b - color.b) * amount),
  };
}

function colorDistance(first: RgbColor, second: RgbColor) {
  return Math.sqrt((first.r - second.r) ** 2 + (first.g - second.g) ** 2 + (first.b - second.b) ** 2);
}

function colorSaturation(color: RgbColor) {
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max === 0 ? 0 : (max - min) / max;
}

function colorHex(color: RgbColor) {
  return "#" + [color.r, color.g, color.b]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("");
}

function readableDark(color: RgbColor) {
  const white = { r: 255, g: 255, b: 255 };
  let result = color;
  let attempts = 0;
  while (contrast(result, white) < 5.2 && attempts < 8) {
    result = mixColor(result, { r: 0, g: 0, b: 0 }, 0.16);
    attempts += 1;
  }
  return result;
}

function isBrandPalette(value: unknown): value is BrandPalette {
  if (!value || typeof value !== "object") return false;
  const palette = value as Record<string, unknown>;
  return ["primary", "dark", "accent", "soft", "onDark"]
    .every((key) => typeof palette[key] === "string" && /^#[0-9a-f]{6}$/i.test(String(palette[key])));
}

function extractBrandPalette(source: File | string) {
  return new Promise<BrandPalette>((resolve, reject) => {
    const image = new Image();
    const objectUrl = typeof source === "string" ? "" : URL.createObjectURL(source);
    image.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível analisar as cores"));
    };
    image.onload = () => {
      try {
        const maxSize = 128;
        const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * ratio));
        canvas.height = Math.max(1, Math.round(image.height * ratio));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas indisponível");
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
        let visiblePixels = 0;

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          if (alpha < 96) continue;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          if (r > 242 && g > 242 && b > 242 && max - min < 18) continue;
          visiblePixels += 1;
          const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
          const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, count: 0 };
          bucket.r += r;
          bucket.g += g;
          bucket.b += b;
          bucket.count += 1;
          buckets.set(key, bucket);
        }

        const colors = Array.from(buckets.values())
          .map((bucket) => ({
            color: {
              r: Math.round(bucket.r / bucket.count),
              g: Math.round(bucket.g / bucket.count),
              b: Math.round(bucket.b / bucket.count),
            },
            count: bucket.count,
          }))
          .filter((entry) => entry.count >= Math.max(2, visiblePixels * 0.002))
          .map((entry) => ({
            ...entry,
            saturation: colorSaturation(entry.color),
            score: entry.count * (0.7 + colorSaturation(entry.color) * 1.8),
          }))
          .sort((first, second) => second.score - first.score);

        if (!colors.length) {
          resolve(DEFAULT_BRAND_PALETTE);
          return;
        }

        const colorful = colors.filter((entry) => entry.saturation >= 0.24);
        let primary = (colorful[0] || colors[0]).color;
        if (luminance(primary) > 0.76) primary = mixColor(primary, { r: 0, g: 0, b: 0 }, 0.24);

        const second = colors.find((entry) => colorDistance(entry.color, primary) >= 58);
        const accent = second?.color || primary;
        const darkCandidate = colors
          .filter((entry) => luminance(entry.color) < 0.32)
          .sort((first, secondEntry) => secondEntry.count - first.count)[0]?.color;
        const dark = readableDark(darkCandidate || mixColor(primary, { r: 0, g: 0, b: 0 }, 0.48));
        const soft = mixColor(primary, { r: 255, g: 255, b: 255 }, 0.9);

        resolve({
          primary: colorHex(primary),
          dark: colorHex(dark),
          accent: colorHex(accent),
          soft: colorHex(soft),
          onDark: contrast(dark, { r: 255, g: 255, b: 255 }) >= 4.5 ? "#ffffff" : "#101820",
        });
      } catch (error) {
        reject(error);
      } finally {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    };
    image.src = typeof source === "string" ? source : objectUrl;
  });
}

function SignaturePad({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setup = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.scale(ratio, ratio);
      context.lineWidth = 2.2;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.strokeStyle = "#101820";
      if (value) {
        const image = new Image();
        image.onload = () => context.drawImage(image, 0, 0, rect.width, rect.height);
        image.src = value;
      }
    };

    setup();
    window.addEventListener("resize", setup);
    return () => window.removeEventListener("resize", setup);
  }, [value]);

  const point = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
  };

  const move = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
  };

  const finish = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  };

  return (
    <div className="signature-wrap">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        aria-label="Área para assinar com o dedo"
      />
      <span>Assine com o dedo ou com a caneta do aparelho</span>
    </div>
  );
}

function ProposalDocument({ proposal, professionalLogo, brandPalette }: { proposal: Proposal; professionalLogo: string; brandPalette: BrandPalette }) {
  const subtotal = proposal.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = proposal.discountType === "percent"
    ? subtotal * (proposal.discountValue / 100)
    : proposal.discountValue;
  const total = Math.max(0, subtotal - discount + proposal.extraCosts);
  const issuerLogo = professionalLogo || proposal.issuer.logo;
  const proposalTheme = {
    "--proposal-primary": brandPalette.primary,
    "--proposal-dark": brandPalette.dark,
    "--proposal-accent": brandPalette.accent,
    "--proposal-soft": brandPalette.soft,
    "--proposal-on-dark": brandPalette.onDark,
  } as CSSProperties;

  return (
    <article className="proposal-sheet" id="proposal-document" style={proposalTheme}>
      <header className="proposal-brand">
        <img
          className={issuerLogo ? "professional-brand-logo custom" : "professional-brand-logo"}
          src={issuerLogo || "/logo-joelson.jpg"}
          alt={"Logomarca profissional de " + proposal.issuer.name}
        />
        <div className="proposal-meta">
          <span>PROPOSTA COMERCIAL</span>
          <strong>{proposal.number}</strong>
          <small>Emissão: {dateBR(proposal.issueDate)}</small>
        </div>
      </header>

      <div className="electric-line" />

      <section className="proposal-heading">
        <div>
          <p>PROPOSTA PARA</p>
          <h1>{proposal.client.company || "Nome do cliente"}</h1>
          {proposal.client.contact && <span>A/C {proposal.client.contact}</span>}
          {proposal.client.document && <span>{proposal.client.document}</span>}
          {proposal.client.address && <span>{proposal.client.address}</span>}
        </div>
        {proposal.client.logo && <img className="client-logo-preview" src={proposal.client.logo} alt="Logomarca do cliente" />}
      </section>

      <section className="proposal-title-block proposal-section">
        <span>SOLUÇÃO PROPOSTA</span>
        <h2>{proposal.title || "Proposta Comercial"}</h2>
        <p>{proposal.objective}</p>
      </section>

      {lines(proposal.scope).length > 0 && (
        <section className="proposal-section document-section">
          <div className="section-number">01</div>
          <div>
            <h3>Escopo</h3>
            <ul>{lines(proposal.scope).map((line, index) => <li key={index}>{line}</li>)}</ul>
          </div>
        </section>
      )}

      {proposal.deliverables && (
        <section className="proposal-section document-section">
          <div className="section-number">02</div>
          <div>
            <h3>Entregáveis</h3>
            <p>{proposal.deliverables}</p>
          </div>
        </section>
      )}

      <section className="proposal-section investment-section">
        <div className="section-title-row">
          <div className="section-number">03</div>
          <h3>Investimento</h3>
        </div>
        <div className="proposal-table-wrap">
          <table className="proposal-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Qtd.</th>
                <th>Un.</th>
                <th>Valor unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {proposal.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.description || "Item da proposta"}</strong>
                    <span>{item.category === "material" ? "Material" : item.category === "servico" ? "Serviço" : "Outro"}</span>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{item.unit}</td>
                  <td>{brl(item.unitPrice)}</td>
                  <td>{brl(item.quantity * item.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="totals-box">
          <div><span>Subtotal</span><strong>{brl(subtotal)}</strong></div>
          {discount > 0 && <div><span>Desconto</span><strong>- {brl(discount)}</strong></div>}
          {proposal.extraCosts > 0 && <div><span>Custos adicionais</span><strong>{brl(proposal.extraCosts)}</strong></div>}
          <div className="grand-total"><span>Investimento total</span><strong>{brl(total)}</strong></div>
        </div>
      </section>

      <section className="proposal-section terms-grid">
        <div>
          <span>CONDIÇÃO DE PAGAMENTO</span>
          <p>{proposal.paymentTerms || "A combinar"}</p>
        </div>
        <div>
          <span>PRAZO</span>
          <p>{proposal.deadline || "A combinar"}</p>
        </div>
        <div>
          <span>GARANTIA</span>
          <p>{proposal.warranty || "Conforme condições"}</p>
        </div>
        <div>
          <span>VALIDADE</span>
          <p>Até {dateBR(proposal.validUntil)}</p>
        </div>
      </section>

      {proposal.notes && (
        <section className="proposal-section notes-box">
          <strong>Observações</strong>
          <p>{proposal.notes}</p>
        </section>
      )}

      <section className="proposal-section signatures">
        <div>
          {proposal.signature ? <img src={proposal.signature} alt="Assinatura de Joelson Mendes" /> : <div className="signature-space" />}
          <strong>{proposal.issuer.name}</strong>
          <span>{proposal.issuer.role}</span>
          {proposal.issuer.document && <small>{proposal.issuer.document}</small>}
        </div>
        <div>
          <div className="signature-space" />
          <strong>{proposal.client.contact || proposal.client.company || "Responsável pelo cliente"}</strong>
          <span>Aprovação do cliente</span>
        </div>
      </section>

      <footer className="proposal-footer">
        <div>
          <strong>{proposal.issuer.name}</strong>
          <span>{proposal.issuer.role}</span>
        </div>
        <div>
          {proposal.issuer.phone && <span>{proposal.issuer.phone}</span>}
          {proposal.issuer.email && <span>{proposal.issuer.email}</span>}
        </div>
      </footer>
    </article>
  );
}

export default function Home() {
  const [state, setState] = useState<AppState>(() => {
    const first = makeProposal(1);
    return { proposals: [first], currentId: first.id, sequence: 1, professionalLogo: "", brandPalette: null };
  });
  const [hydrated, setHydrated] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [online, setOnline] = useState(true);
  const [listeningField, setListeningField] = useState("");
  const [voiceCommand, setVoiceCommand] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("Pronto para preencher a proposta por voz.");
  const [logoProcessing, setLogoProcessing] = useState(false);
  const [toast, setToast] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const current = state.proposals.find((proposal) => proposal.id === state.currentId) || state.proposals[0];
  const activeProfessionalLogo = state.professionalLogo || current.issuer.logo;
  const activeBrandPalette = state.brandPalette || DEFAULT_BRAND_PALETTE;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        if (Array.isArray(parsed.proposals) && parsed.proposals.length) {
          const normalized = parsed.proposals.map((proposal, index) => normalizeProposal(proposal, index + 1));
          const professionalLogo = parsed.professionalLogo || normalized.find((proposal) => proposal.issuer.logo)?.issuer.logo || "";
          const proposals = normalized.map((proposal) => ({
            ...proposal,
            issuer: { ...proposal.issuer, logo: "" },
          }));
          const currentExists = proposals.some((proposal) => proposal.id === parsed.currentId);
          setState({
            proposals,
            currentId: currentExists ? parsed.currentId : proposals[0].id,
            sequence: Math.max(parsed.sequence || proposals.length, proposals.length),
            professionalLogo,
            brandPalette: isBrandPalette(parsed.brandPalette) ? parsed.brandPalette : null,
          });
        }
      }
      const savedTheme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    } catch {
      // Mantém um novo documento se o armazenamento local estiver corrompido.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !activeProfessionalLogo || state.brandPalette) return;
    let cancelled = false;
    setLogoProcessing(true);
    extractBrandPalette(activeProfessionalLogo)
      .then((palette) => {
        if (cancelled) return;
        setState((previous) => previous.professionalLogo && !previous.brandPalette
          ? { ...previous, brandPalette: palette }
          : previous);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLogoProcessing(false);
      });
    return () => { cancelled = true; };
  }, [activeProfessionalLogo, hydrated, state.brandPalette]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const syncOnline = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    syncOnline();
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = current.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = current.discountType === "percent"
      ? subtotal * (current.discountValue / 100)
      : current.discountValue;
    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount + current.extraCosts),
    };
  }, [current]);

  const itemCatalog = useMemo(() => {
    const learned = new Map<string, LineItem>();
    state.proposals.forEach((proposal) => proposal.items.forEach((item) => {
      const key = item.description.trim().toLocaleLowerCase("pt-BR");
      if (key && item.unitPrice > 0) learned.set(key, item);
    }));
    return Array.from(learned.values());
  }, [state.proposals]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  };

  const updateCurrent = (patch: Partial<Proposal>) => {
    setState((previous) => ({
      ...previous,
      proposals: previous.proposals.map((proposal) => proposal.id === previous.currentId
        ? { ...proposal, ...patch, updatedAt: new Date().toISOString() }
        : proposal),
    }));
  };

  const updateClient = (patch: Partial<Proposal["client"]>) => {
    updateCurrent({ client: { ...current.client, ...patch } });
  };

  const updateIssuer = (patch: Partial<Proposal["issuer"]>) => {
    updateCurrent({ issuer: { ...current.issuer, ...patch } });
  };

  const updateItem = (id: string, patch: Partial<LineItem>) => {
    updateCurrent({ items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) });
  };

  const createNew = () => {
    const nextSequence = state.sequence + 1;
    const proposal = {
      ...makeProposal(nextSequence),
      issuer: { ...current.issuer },
      signature: current.signature,
    };
    setState((previous) => ({
      ...previous,
      proposals: [proposal, ...previous.proposals],
      currentId: proposal.id,
      sequence: nextSequence,
    }));
    setDrawerOpen(false);
    setMobileView("edit");
    notify("Nova proposta criada");
  };

  const duplicateCurrent = () => {
    const nextSequence = state.sequence + 1;
    const copy: Proposal = {
      ...current,
      id: uid(),
      number: proposalNumber(nextSequence),
      status: "rascunho",
      title: current.title + " - cópia",
      issueDate: isoDate(),
      validUntil: addDays(15),
      updatedAt: new Date().toISOString(),
      items: current.items.map((item) => ({ ...item, id: uid() })),
    };
    setState((previous) => ({
      ...previous,
      proposals: [copy, ...previous.proposals],
      currentId: copy.id,
      sequence: nextSequence,
    }));
    notify("Proposta duplicada");
  };

  const deleteCurrent = () => {
    if (!window.confirm("Excluir esta proposta do aparelho?")) return;
    setState((previous) => {
      const remaining = previous.proposals.filter((proposal) => proposal.id !== previous.currentId);
      if (remaining.length) {
        return { ...previous, proposals: remaining, currentId: remaining[0].id };
      }
      const nextSequence = previous.sequence + 1;
      const replacement = makeProposal(nextSequence);
      return { ...previous, proposals: [replacement], currentId: replacement.id, sequence: nextSequence };
    });
    notify("Proposta excluída");
  };

  const applyTemplate = (template: (typeof templates)[number]) => {
    updateCurrent({
      title: template.title,
      objective: template.objective,
      scope: template.scope,
      deliverables: template.deliverables,
      items: template.items.map((item) => ({ ...item, id: uid() })),
    });
    notify("Modelo " + template.name + " aplicado");
  };

  const addItem = () => {
    updateCurrent({ items: [...current.items, { ...emptyItem(), description: "" }] });
  };

  const removeItem = (id: string) => {
    if (current.items.length === 1) {
      notify("A proposta precisa ter pelo menos um item");
      return;
    }
    updateCurrent({ items: current.items.filter((item) => item.id !== id) });
  };

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.dataset.theme = next;
  };

  const startVoice = (field: string, onResult: (text: string) => void) => {
    const speechWindow = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      notify("Ditado por voz não disponível neste navegador");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;
    setListeningField(field);
    recognition.onresult = (event) => onResult(event.results[0][0].transcript);
    recognition.onerror = () => notify("Não foi possível reconhecer o áudio");
    recognition.onend = () => setListeningField("");
    recognition.start();
  };

  const applyVoiceCommand = (spoken: string) => {
    const original = spoken.trim();
    const command = original.replace(/^(?:preencha|preencher|defina|definir|altere|alterar)\s+(?:o campo\s+)?/i, "").trim();
    const capture = (pattern: RegExp) => command.match(pattern)?.[1]?.trim() || "";
    const success = (message: string) => {
      setVoiceCommand(original);
      setVoiceFeedback(message);
      notify(message);
    };

    let value = capture(/^(?:cliente|empresa)\s+(.+)$/i);
    if (value) {
      updateClient({ company: value });
      success("Cliente preenchido: " + value);
      return;
    }

    value = capture(/^(?:contato|respons[aá]vel do cliente|aos cuidados de)\s+(.+)$/i);
    if (value) {
      updateClient({ contact: value });
      success("Contato do cliente preenchido");
      return;
    }

    value = capture(/^(?:cnpj|cpf|documento)(?: do cliente)?\s+(.+)$/i);
    if (value) {
      updateClient({ document: value });
      success("Documento do cliente preenchido");
      return;
    }

    value = capture(/^(?:telefone|whatsapp)(?: do cliente)?\s+(.+)$/i);
    if (value) {
      updateClient({ phone: value });
      success("Telefone do cliente preenchido");
      return;
    }

    value = capture(/^(?:e-mail|email)(?: do cliente)?\s+(.+)$/i);
    if (value) {
      const email = value
        .replace(/\s+arroba\s+/gi, "@")
        .replace(/\s+ponto\s+/gi, ".")
        .replace(/\s+/g, "");
      updateClient({ email });
      success("E-mail do cliente preenchido");
      return;
    }

    value = capture(/^endere[cç]o(?: do cliente)?\s+(.+)$/i);
    if (value) {
      updateClient({ address: value });
      success("Endereço do cliente preenchido");
      return;
    }

    value = capture(/^(?:t[ií]tulo|nome da proposta)\s+(.+)$/i);
    if (value) {
      updateCurrent({ title: value });
      success("Título da proposta preenchido");
      return;
    }

    value = capture(/^objetivo\s+(.+)$/i);
    if (value) {
      updateCurrent({ objective: value });
      success("Objetivo preenchido");
      return;
    }

    value = capture(/^escopo\s+(.+)$/i);
    if (value) {
      updateCurrent({ scope: listFromSpeech(value) });
      success("Escopo preenchido");
      return;
    }

    value = capture(/^(?:entreg[aá]veis|entrega)\s+(.+)$/i);
    if (value) {
      updateCurrent({ deliverables: listFromSpeech(value) });
      success("Entregáveis preenchidos");
      return;
    }

    value = capture(/^(?:condi[cç][aã]o de pagamento|pagamento)\s+(.+)$/i);
    if (value) {
      updateCurrent({ paymentTerms: value });
      success("Condição de pagamento preenchida");
      return;
    }

    value = capture(/^(?:prazo de entrega|prazo)\s+(.+)$/i);
    if (value) {
      updateCurrent({ deadline: value });
      success("Prazo preenchido");
      return;
    }

    value = capture(/^garantia\s+(.+)$/i);
    if (value) {
      updateCurrent({ warranty: value });
      success("Garantia preenchida");
      return;
    }

    value = capture(/^observa[cç][oõ]es?\s+(.+)$/i);
    if (value) {
      updateCurrent({ notes: value });
      success("Observações preenchidas");
      return;
    }

    value = capture(/^validade\s+(.+?)\s+dias?$/i);
    if (value) {
      const days = parseSpokenNumber(value);
      if (days > 0) {
        updateCurrent({ validUntil: addDaysTo(current.issueDate, days) });
        success("Validade definida para " + days + " dias");
        return;
      }
    }

    const percentDiscount = command.match(/^desconto\s+(.+?)\s*(?:por cento|%)$/i);
    if (percentDiscount) {
      const amount = parseSpokenNumber(percentDiscount[1]);
      updateCurrent({ discountType: "percent", discountValue: amount });
      success("Desconto definido em " + amount + "%");
      return;
    }

    const fixedDiscount = command.match(/^desconto\s+(.+?)(?:\s+reais)?$/i);
    if (fixedDiscount) {
      const amount = parseSpokenNumber(fixedDiscount[1]);
      updateCurrent({ discountType: "fixed", discountValue: amount });
      success("Desconto fixo definido em " + brl(amount));
      return;
    }

    value = capture(/^(?:custo adicional|custos adicionais|frete)\s+(.+?)(?:\s+reais)?$/i);
    if (value) {
      const amount = parseSpokenNumber(value);
      updateCurrent({ extraCosts: amount });
      success("Custos adicionais definidos em " + brl(amount));
      return;
    }

    if (/^(?:(?:adicionar|incluir|criar)\s+(?:um\s+)?item|item)\b/i.test(command)) {
      const item = spokenItem(command);
      updateCurrent({ items: [...current.items, item] });
      success("Item adicionado: " + item.description);
      return;
    }

    value = capture(/^(?:meu nome|respons[aá]vel t[eé]cnico)\s+(.+)$/i);
    if (value) {
      updateIssuer({ name: value });
      success("Responsável técnico preenchido");
      return;
    }

    value = capture(/^(?:minha fun[cç][aã]o|minha especialidade)\s+(.+)$/i);
    if (value) {
      updateIssuer({ role: value });
      success("Função do responsável preenchida");
      return;
    }

    value = capture(/^(?:meu telefone|meu whatsapp)\s+(.+)$/i);
    if (value) {
      updateIssuer({ phone: value });
      success("Seu telefone foi preenchido");
      return;
    }

    value = capture(/^(?:meu e-mail|meu email)\s+(.+)$/i);
    if (value) {
      const email = value.replace(/\s+arroba\s+/gi, "@").replace(/\s+ponto\s+/gi, ".").replace(/\s+/g, "");
      updateIssuer({ email });
      success("Seu e-mail foi preenchido");
      return;
    }

    setVoiceCommand(original);
    setVoiceFeedback("Não reconheci esse comando. Use um dos exemplos abaixo e fale um campo por vez.");
    notify("Comando não reconhecido");
  };

  const listenForCommand = () => {
    startVoice("assistant", (text) => {
      setVoiceCommand(text);
      applyVoiceCommand(text);
    });
  };

  const handleClientLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Selecione uma imagem válida");
      return;
    }
    try {
      updateClient({ logo: await compressImage(file) });
      notify("Logomarca do cliente adicionada");
    } catch {
      notify("Não foi possível processar a imagem");
    }
    event.target.value = "";
  };

  const setProfessionalLogo = (logo: string, brandPalette: BrandPalette | null) => {
    setState((previous) => ({
      ...previous,
      professionalLogo: logo,
      brandPalette,
      proposals: previous.proposals.map((proposal) => proposal.issuer.logo
        ? { ...proposal, issuer: { ...proposal.issuer, logo: "" } }
        : proposal),
    }));
  };

  const handleProfessionalLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Selecione uma imagem válida");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      notify("A imagem deve ter no máximo 8 MB");
      event.target.value = "";
      return;
    }
    setLogoProcessing(true);
    try {
      const [logo, palette] = await Promise.all([compressImage(file), extractBrandPalette(file)]);
      setProfessionalLogo(logo, palette);
      notify("Cores da logomarca identificadas e aplicadas");
    } catch {
      notify("Não foi possível processar a logomarca");
    } finally {
      setLogoProcessing(false);
    }
    event.target.value = "";
  };

  const printProposal = () => {
    setMobileView("preview");
    const oldTitle = document.title;
    document.title = current.number + " - " + (current.client.company || current.title);
    const restore = () => { document.title = oldTitle; };
    window.addEventListener("afterprint", restore, { once: true });
    window.setTimeout(() => {
      window.print();
      window.setTimeout(restore, 1200);
    }, 120);
  };

  const shareProposal = async () => {
    const greeting = current.client.contact || current.client.company || "cliente";
    const message = "Olá, " + greeting + ". Segue a proposta " + current.number + " - " + current.title + ", no valor total de " + brl(totals.total) + ". Validade: " + dateBR(current.validUntil) + ".";
    if (navigator.share) {
      try {
        await navigator.share({ title: current.title, text: message });
        return;
      } catch {
        return;
      }
    }
    window.open("https://wa.me/?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
  };

  const installApp = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") notify("Aplicativo instalado");
    setInstallPrompt(null);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ version: 1, ...state }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "backup-propostas-joelson-" + isoDate() + ".json";
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Backup exportado");
  };

  const importBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (!Array.isArray(parsed.proposals) || !parsed.proposals.length) throw new Error("Formato inválido");
        const normalized = parsed.proposals.map((proposal, index) => normalizeProposal(proposal, index + 1));
        const importedLogo = parsed.professionalLogo || normalized.find((proposal) => proposal.issuer.logo)?.issuer.logo || "";
        const importedPalette = isBrandPalette(parsed.brandPalette) ? parsed.brandPalette : null;
        const imported = normalized.map((proposal) => ({
          ...proposal,
          id: uid(),
          items: proposal.items.map((item) => ({ ...item, id: uid() })),
          issuer: { ...proposal.issuer, logo: "" },
        }));
        setState((previous) => ({
          ...previous,
          proposals: [...imported, ...previous.proposals],
          currentId: imported[0].id,
          sequence: previous.sequence + imported.length,
          professionalLogo: previous.professionalLogo || importedLogo,
          brandPalette: previous.professionalLogo ? previous.brandPalette : importedPalette,
        }));
        notify(imported.length + " proposta(s) importada(s)");
      } catch {
        notify("Arquivo de backup inválido");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="app-shell">
      <aside className={"drafts-panel " + (drawerOpen ? "is-open" : "")}>
        <div className="brand-mini">
          <img src="/icons/icon-192.png" alt="JM" />
          <div><strong>Proposta Mendes</strong><span>PRO</span></div>
        </div>
        <button className="primary-button new-button" onClick={createNew}>+ Nova proposta</button>
        <div className="drafts-title">
          <span>MINHAS PROPOSTAS</span>
          <small>{state.proposals.length}</small>
        </div>
        <div className="drafts-list">
          {state.proposals.map((proposal) => (
            <button
              key={proposal.id}
              className={"draft-card " + (proposal.id === state.currentId ? "active" : "")}
              onClick={() => {
                setState((previous) => ({ ...previous, currentId: proposal.id }));
                setDrawerOpen(false);
              }}
            >
              <span className={"status-dot " + proposal.status} />
              <div>
                <strong>{proposal.client.company || "Novo cliente"}</strong>
                <span>{proposal.title}</span>
                <small>{proposal.number} · {dateBR(proposal.issueDate)}</small>
              </div>
            </button>
          ))}
        </div>
        <div className="sidebar-footer">
          <button onClick={exportBackup}>Exportar backup</button>
          <button onClick={() => importRef.current?.click()}>Importar backup</button>
          <input ref={importRef} type="file" accept="application/json" hidden onChange={importBackup} />
          <span>{online ? "Dados salvos neste aparelho" : "Modo offline ativo"}</span>
        </div>
      </aside>

      {drawerOpen && <button className="drawer-scrim" onClick={() => setDrawerOpen(false)} aria-label="Fechar propostas" />}

      <div className="workspace">
        <header className="app-header">
          <div className="header-title">
            <button className="icon-button menu-button" onClick={() => setDrawerOpen(true)} aria-label="Abrir propostas">☰</button>
            <div>
              <span>{current.number}</span>
              <strong>{current.client.company || "Nova proposta"}</strong>
            </div>
            {!online && <small className="offline-pill">OFFLINE</small>}
          </div>
          <div className="header-actions">
            <button className="secondary-button compact" onClick={toggleTheme}>{theme === "light" ? "Modo escuro" : "Modo claro"}</button>
            <button className="secondary-button compact voice-header" onClick={() => {
              setMobileView("edit");
              document.getElementById("voice-command-center")?.scrollIntoView({ behavior: "smooth", block: "center" });
              listenForCommand();
            }}>Comando de voz</button>
            <button className="secondary-button compact" onClick={installApp}>Instalar app</button>
            <button className="secondary-button compact share-button" onClick={shareProposal}>Compartilhar</button>
            <button className="primary-button compact" onClick={printProposal}>Salvar em PDF</button>
          </div>
        </header>

        <main className="studio">
          <section className={"editor-pane " + (mobileView === "edit" ? "mobile-active" : "")}>
            <div className="editor-intro">
              <div>
                <span>EDITOR INTELIGENTE</span>
                <h1>Monte sua proposta</h1>
                <p>Preencha os dados. O documento profissional é atualizado automaticamente.</p>
              </div>
              <select value={current.status} onChange={(event) => updateCurrent({ status: event.target.value as ProposalStatus })} aria-label="Status da proposta">
                <option value="rascunho">Rascunho</option>
                <option value="enviada">Enviada</option>
                <option value="aprovada">Aprovada</option>
              </select>
            </div>

            <section className="voice-command-card" id="voice-command-center">
              <div className="voice-command-top">
                <div>
                  <span>ASSISTENTE DE VOZ</span>
                  <h2>Fale o campo e o conteúdo</h2>
                  <p>Use um comando por vez. Exemplo: “Cliente Energisa”.</p>
                </div>
                <button
                  className={listeningField === "assistant" ? "voice-master-button listening" : "voice-master-button"}
                  onClick={listenForCommand}
                  aria-label="Ouvir comando para preencher a proposta"
                >
                  <span aria-hidden="true">🎙</span>
                  {listeningField === "assistant" ? "Ouvindo…" : "Falar comando"}
                </button>
              </div>

              <form className="voice-command-form" onSubmit={(event) => {
                event.preventDefault();
                if (voiceCommand.trim()) applyVoiceCommand(voiceCommand);
              }}>
                <input
                  value={voiceCommand}
                  onChange={(event) => setVoiceCommand(event.target.value)}
                  placeholder="Ou digite: Prazo 15 dias úteis"
                  aria-label="Comando para preencher a proposta"
                />
                <button type="submit">Aplicar comando</button>
              </form>

              <div className={listeningField === "assistant" ? "voice-feedback active" : "voice-feedback"}>
                <span>{listeningField === "assistant" ? "MICROFONE ATIVO" : "RETORNO"}</span>
                <strong>{listeningField === "assistant" ? "Pode falar. Estou ouvindo…" : voiceFeedback}</strong>
                {voiceCommand && listeningField !== "assistant" && <small>“{voiceCommand}”</small>}
              </div>

              <details className="voice-examples">
                <summary>Ver exemplos de comandos</summary>
                <div>
                  {[
                    "Cliente Energisa",
                    "Responsável do cliente Carlos Silva",
                    "Título montagem de quadro elétrico",
                    "Objetivo modernizar o sistema de controle",
                    "Escopo montagem, programação, testes e comissionamento",
                    "Prazo 15 dias úteis",
                    "Pagamento 50% na aprovação e 50% na entrega",
                    "Validade 30 dias",
                    "Item disjuntor caixa moldada quantidade 2 valor 1.200 reais categoria material unidade peça",
                    "Desconto 10 por cento",
                  ].map((example) => <button type="button" key={example} onClick={() => setVoiceCommand(example)}>{example}</button>)}
                </div>
              </details>
            </section>

            <section className="editor-card template-card">
              <div className="card-heading">
                <div><span>ATALHOS</span><h2>Comece por um modelo</h2></div>
              </div>
              <div className="template-chips">
                {templates.map((template) => <button key={template.name} onClick={() => applyTemplate(template)}>{template.name}</button>)}
              </div>
            </section>

            <section className="editor-card">
              <div className="card-heading">
                <div><span>01</span><h2>Identificação</h2></div>
                <button className="text-button" onClick={duplicateCurrent}>Duplicar</button>
              </div>
              <div className="form-grid two-columns">
                <label><span>Número da proposta</span><input value={current.number} onChange={(event) => updateCurrent({ number: event.target.value })} /></label>
                <label><span>Título</span><input value={current.title} onChange={(event) => updateCurrent({ title: event.target.value })} /></label>
                <label><span>Data de emissão</span><input type="date" value={current.issueDate} onChange={(event) => updateCurrent({ issueDate: event.target.value })} /></label>
                <label><span>Válida até</span><input type="date" value={current.validUntil} onChange={(event) => updateCurrent({ validUntil: event.target.value })} /></label>
              </div>
            </section>

            <section className="editor-card">
              <div className="card-heading"><div><span>02</span><h2>Cliente</h2></div></div>
              <div className="form-grid two-columns">
                <label><span>Empresa / cliente</span><input value={current.client.company} onChange={(event) => updateClient({ company: event.target.value })} placeholder="Nome do cliente" /></label>
                <label><span>Pessoa de contato</span><input value={current.client.contact} onChange={(event) => updateClient({ contact: event.target.value })} placeholder="Responsável" /></label>
                <label><span>CPF / CNPJ</span><input value={current.client.document} onChange={(event) => updateClient({ document: event.target.value })} /></label>
                <label><span>Telefone</span><input inputMode="tel" value={current.client.phone} onChange={(event) => updateClient({ phone: event.target.value })} /></label>
                <label><span>E-mail</span><input type="email" value={current.client.email} onChange={(event) => updateClient({ email: event.target.value })} /></label>
                <label><span>Endereço</span><input value={current.client.address} onChange={(event) => updateClient({ address: event.target.value })} /></label>
              </div>
              <div className="upload-row">
                <label className="upload-button">Adicionar logomarca do cliente<input type="file" accept="image/*" hidden onChange={handleClientLogo} /></label>
                {current.client.logo && <><img src={current.client.logo} alt="Logomarca do cliente" /><button className="text-button danger" onClick={() => updateClient({ logo: "" })}>Remover</button></>}
              </div>
            </section>

            <section className="editor-card">
              <div className="card-heading"><div><span>03</span><h2>Solução</h2></div></div>
              <label className="field-with-action">
                <span>Objetivo</span>
                <textarea rows={4} value={current.objective} onChange={(event) => updateCurrent({ objective: event.target.value })} />
                <button className={listeningField === "objective" ? "voice-button listening" : "voice-button"} onClick={() => startVoice("objective", (text) => updateCurrent({ objective: current.objective ? current.objective + " " + text : text }))}>{listeningField === "objective" ? "Ouvindo…" : "Ditar"}</button>
              </label>
              <label><span>Escopo <small>um item por linha</small></span><textarea rows={6} value={current.scope} onChange={(event) => updateCurrent({ scope: event.target.value })} /></label>
              <label><span>Entregáveis</span><textarea rows={3} value={current.deliverables} onChange={(event) => updateCurrent({ deliverables: event.target.value })} /></label>
            </section>

            <section className="editor-card">
              <div className="card-heading">
                <div><span>04</span><h2>Itens e valores</h2></div>
                <div className="item-heading-actions">
                  <button
                    className={listeningField === "new-item" ? "voice-add-button listening" : "voice-add-button"}
                    onClick={() => startVoice("new-item", (text) => {
                      updateCurrent({ items: [...current.items, spokenItem(text)] });
                      notify("Item criado pelo ditado");
                    })}
                  >
                    {listeningField === "new-item" ? "Ouvindo…" : "+ Item por voz"}
                  </button>
                  <strong className="running-total">{brl(totals.total)}</strong>
                </div>
              </div>
              <div className="items-editor">
                {current.items.map((item, index) => (
                  <div className="item-editor" key={item.id}>
                    <div className="item-index">{String(index + 1).padStart(2, "0")}</div>
                    <div className="item-fields">
                      <label className="item-description"><span>Descrição</span><input list="item-catalog" value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} onBlur={() => {
                        const learned = itemCatalog.find((catalogItem) => catalogItem.description.toLocaleLowerCase("pt-BR") === item.description.trim().toLocaleLowerCase("pt-BR"));
                        if (learned && item.unitPrice === 0) updateItem(item.id, { category: learned.category, unit: learned.unit, unitPrice: learned.unitPrice });
                      }} /></label>
                      <label><span>Categoria</span><select value={item.category} onChange={(event) => updateItem(item.id, { category: event.target.value as ItemCategory })}><option value="servico">Serviço</option><option value="material">Material</option><option value="outro">Outro</option></select></label>
                      <label><span>Quantidade</span><input type="number" min="0" step="0.01" inputMode="decimal" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })} /></label>
                      <label><span>Unidade</span><input value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} /></label>
                      <label><span>Valor unitário</span><input type="number" min="0" step="0.01" inputMode="decimal" value={item.unitPrice} onChange={(event) => updateItem(item.id, { unitPrice: Number(event.target.value) })} /></label>
                    </div>
                    <button className="remove-item" onClick={() => removeItem(item.id)} aria-label={"Remover item " + (index + 1)}>×</button>
                  </div>
                ))}
              </div>
              <datalist id="item-catalog">
                {itemCatalog.map((item) => <option key={item.description} value={item.description}>{brl(item.unitPrice)}</option>)}
              </datalist>
              <button className="add-item-button" onClick={addItem}>+ Adicionar item</button>
              <div className="price-adjustments">
                <label><span>Tipo de desconto</span><select value={current.discountType} onChange={(event) => updateCurrent({ discountType: event.target.value as "percent" | "fixed" })}><option value="percent">Percentual (%)</option><option value="fixed">Valor fixo (R$)</option></select></label>
                <label><span>Desconto</span><input type="number" min="0" step="0.01" inputMode="decimal" value={current.discountValue} onChange={(event) => updateCurrent({ discountValue: Number(event.target.value) })} /></label>
                <label><span>Custos adicionais</span><input type="number" min="0" step="0.01" inputMode="decimal" value={current.extraCosts} onChange={(event) => updateCurrent({ extraCosts: Number(event.target.value) })} /></label>
              </div>
            </section>

            <section className="editor-card">
              <div className="card-heading"><div><span>05</span><h2>Condições</h2></div></div>
              <div className="form-grid two-columns">
                <label><span>Pagamento</span><textarea rows={3} value={current.paymentTerms} onChange={(event) => updateCurrent({ paymentTerms: event.target.value })} /></label>
                <label><span>Prazo de entrega</span><textarea rows={3} value={current.deadline} onChange={(event) => updateCurrent({ deadline: event.target.value })} /></label>
                <label><span>Garantia</span><textarea rows={3} value={current.warranty} onChange={(event) => updateCurrent({ warranty: event.target.value })} /></label>
                <label><span>Observações</span><textarea rows={3} value={current.notes} onChange={(event) => updateCurrent({ notes: event.target.value })} /></label>
              </div>
            </section>

            <section className="editor-card">
              <div className="card-heading"><div><span>06</span><h2>Seus dados e assinatura</h2></div></div>
              <div className="professional-logo-manager">
                <div className="professional-logo-preview">
                  <img src={activeProfessionalLogo || "/logo-joelson.jpg"} alt="Prévia da logomarca do profissional" />
                  <div>
                    <span>LOGOMARCA DO PROFISSIONAL</span>
                    <strong>{activeProfessionalLogo ? "Logomarca personalizada" : "Logomarca padrão JM"}</strong>
                    <p>{logoProcessing ? "Analisando as cores da imagem…" : activeProfessionalLogo ? "Paleta identificada e aplicada automaticamente à proposta e ao PDF." : "Ela aparecerá no cabeçalho do PDF e será reaproveitada nas próximas propostas."}</p>
                    {activeProfessionalLogo && (
                      <div className="brand-palette-preview" aria-label="Cores identificadas na logomarca">
                        {[
                          ["Principal", activeBrandPalette.primary],
                          ["Secundária", activeBrandPalette.accent],
                          ["Contraste", activeBrandPalette.dark],
                        ].map(([label, color]) => (
                          <span key={label} title={`${label}: ${color}`} style={{ backgroundColor: color }}>
                            <i>{label}</i>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="professional-logo-actions">
                  <label className="upload-button">
                    {logoProcessing ? "Analisando cores…" : activeProfessionalLogo ? "Alterar logomarca" : "Inserir minha logomarca"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={logoProcessing} onChange={handleProfessionalLogo} />
                  </label>
                  {activeProfessionalLogo && <button className="text-button" onClick={() => {
                    setProfessionalLogo("", null);
                    notify("Logomarca padrão restaurada");
                  }}>Restaurar padrão</button>}
                </div>
              </div>
              <div className="form-grid two-columns">
                <label><span>Responsável</span><input value={current.issuer.name} onChange={(event) => updateIssuer({ name: event.target.value })} /></label>
                <label><span>Especialidade / função</span><input value={current.issuer.role} onChange={(event) => updateIssuer({ role: event.target.value })} /></label>
                <label><span>Telefone</span><input inputMode="tel" value={current.issuer.phone} onChange={(event) => updateIssuer({ phone: event.target.value })} /></label>
                <label><span>E-mail</span><input type="email" value={current.issuer.email} onChange={(event) => updateIssuer({ email: event.target.value })} /></label>
                <label><span>CPF / CNPJ / registro</span><input value={current.issuer.document} onChange={(event) => updateIssuer({ document: event.target.value })} /></label>
              </div>
              <SignaturePad value={current.signature} onChange={(signature) => updateCurrent({ signature })} />
              {current.signature && <button className="text-button danger signature-clear" onClick={() => updateCurrent({ signature: "" })}>Limpar assinatura</button>}
            </section>

            <section className="editor-card danger-zone">
              <div><strong>Excluir proposta</strong><span>Remove este rascunho somente deste aparelho.</span></div>
              <button onClick={deleteCurrent}>Excluir</button>
            </section>
          </section>

          <section className={"preview-pane " + (mobileView === "preview" ? "mobile-active" : "")}>
            <div className="preview-toolbar">
              <div><span>PRÉ-VISUALIZAÇÃO A4</span><small>Atualização automática</small></div>
              <div><strong>{brl(totals.total)}</strong><button className="primary-button compact" onClick={printProposal}>Salvar em PDF</button></div>
            </div>
            <div className="preview-scroll"><ProposalDocument proposal={current} professionalLogo={activeProfessionalLogo} brandPalette={activeBrandPalette} /></div>
          </section>
        </main>
      </div>

      <nav className="mobile-tabs" aria-label="Alternar editor e visualização">
        <button className={mobileView === "edit" ? "active" : ""} onClick={() => setMobileView("edit")}><span>✎</span>Editar</button>
        <button onClick={() => {
          setMobileView("edit");
          window.setTimeout(() => {
            document.getElementById("voice-command-center")?.scrollIntoView({ behavior: "smooth", block: "center" });
            listenForCommand();
          }, 120);
        }}><span>🎙</span>Voz</button>
        <button className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}><span>▤</span>Visualizar</button>
        <button onClick={printProposal}><span>⇩</span>PDF</button>
      </nav>

      {showInstallHelp && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="install-title">
          <div className="modal-card">
            <button className="modal-close" onClick={() => setShowInstallHelp(false)} aria-label="Fechar">×</button>
            <img src="/icons/icon-192.png" alt="JM" />
            <span>APLICATIVO INSTALÁVEL</span>
            <h2 id="install-title">Coloque na tela inicial</h2>
            <div className="install-steps">
              <div><strong>Android · Chrome</strong><p>Abra o menu ⋮ e toque em <b>Adicionar à tela inicial</b> ou <b>Instalar aplicativo</b>.</p></div>
              <div><strong>iPhone · Safari</strong><p>Toque em Compartilhar e depois em <b>Adicionar à Tela de Início</b>.</p></div>
            </div>
            <button className="primary-button" onClick={() => setShowInstallHelp(false)}>Entendi</button>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
