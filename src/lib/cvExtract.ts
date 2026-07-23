// lib/cvExtract.ts
// Extrae texto de un archivo de CV (TXT / PDF / Word) sin dependencias
// externas. Reutilizable por el flujo de convalidación de Ómicron.

async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const raw = new TextDecoder('latin1').decode(bytes);
  const chunks: string[] = [];

  const push = (s: string) => {
    const c = s
      .replace(/\\n/g, '\n').replace(/\\r/g, '')
      .replace(/\\\(/g, '(').replace(/\\\)/g, ')').replace(/\\\\/g, '\\');
    if (c.trim()) chunks.push(c);
  };

  let m: RegExpExecArray | null;
  const tj = /\(([^)]*)\)\s*T[jJ]/g;
  while ((m = tj.exec(raw)) !== null) push(m[1]);

  const tjArr = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tjArr.exec(raw)) !== null) {
    const part = /\(([^)]*)\)/g;
    let p: RegExpExecArray | null;
    while ((p = part.exec(m[1])) !== null) push(p[1]);
  }

  const seen = new Set<string>();
  return chunks
    .filter((c) => { const n = c.trim().toLowerCase(); if (n.length < 2 || seen.has(n)) return false; seen.add(n); return true; })
    .join(' ').replace(/\s+/g, ' ').trim();
}

async function extractTextFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buffer));
    const parts: string[] = [];
    const wt = /<w:t[^>]*>([^<]*)<\/w:t>/g;
    let m: RegExpExecArray | null;
    while ((m = wt.exec(raw)) !== null) { if (m[1].trim()) parts.push(m[1]); }
    if (parts.length > 0) return parts.join(' ').replace(/\s+/g, ' ').trim();
    const cleaned = raw.replace(/<[^>]+>/g, ' ').replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u024F]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.length > 50 ? cleaned.slice(0, 8000) : '';
  } catch {
    return '';
  }
}

/** Extrae el texto de un archivo de CV (TXT/PDF/DOCX). */
export async function extractCVText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return (await extractTextFromPDF(await file.arrayBuffer())).slice(0, 8000);
  if (name.endsWith('.docx') || name.endsWith('.doc')) return (await extractTextFromDocx(await file.arrayBuffer())).slice(0, 8000);
  return (await file.text()).slice(0, 8000);
}
