// lib/cvExtract.ts
// Lectura ROBUSTA de CV (PDF y Word) — carga PDF.js y Mammoth desde CDN en
// runtime (sin dependencias en el build). Lee prácticamente cualquier
// documento. Si algo falla, cae a texto plano.

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-cv="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.setAttribute('data-cv', src);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar ' + src));
    document.head.appendChild(s);
  });
}

interface PdfItem { str?: string }
interface PdfPage { getTextContent(): Promise<{ items: PdfItem[] }> }
interface PdfDoc { numPages: number; getPage(n: number): Promise<PdfPage> }
interface PdfLib {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(src: { data: ArrayBuffer }): { promise: Promise<PdfDoc> };
}
interface MammothLib { extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> }

async function pdfText(buffer: ArrayBuffer): Promise<string> {
  const w = window as unknown as { pdfjsLib?: PdfLib };
  if (!w.pdfjsLib) {
    await loadScript(PDFJS);
    if (w.pdfjsLib) w.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  }
  if (!w.pdfjsLib) throw new Error('pdfjs no disponible');
  const pdf = await w.pdfjsLib.getDocument({ data: buffer }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it) => it.str ?? '').join(' ') + '\n';
  }
  return out.replace(/\s+/g, ' ').trim();
}

async function docxText(buffer: ArrayBuffer): Promise<string> {
  const w = window as unknown as { mammoth?: MammothLib };
  if (!w.mammoth) await loadScript(MAMMOTH);
  if (!w.mammoth) throw new Error('mammoth no disponible');
  const res = await w.mammoth.extractRawText({ arrayBuffer: buffer });
  return (res.value || '').replace(/\s+/g, ' ').trim();
}

/** Extrae el texto de un CV (PDF / Word / TXT). Robusto y con fallback. */
export async function extractCVText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  try {
    if (name.endsWith('.pdf')) {
      const t = await pdfText(buffer.slice(0));
      if (t.length > 15) return t.slice(0, 15000);
    } else if (name.endsWith('.docx')) {
      const t = await docxText(buffer.slice(0));
      if (t.length > 15) return t.slice(0, 15000);
    }
  } catch {
    /* cae al fallback de texto plano */
  }
  try {
    const t = (await file.text()).trim();
    if (t.length > 15) return t.slice(0, 15000);
  } catch {
    /* noop */
  }
  return '';
}
