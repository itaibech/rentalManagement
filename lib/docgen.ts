'use client';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { supabase } from './supabase';

/** Fill a Word template from the private bucket. Throws a readable Hebrew error if it is missing. */
export async function fillTemplate(path: string, data: Record<string, string>): Promise<Blob> {
  const { data: file, error } = await supabase.storage.from('rental').download(path);
  if (error || !file) throw new Error('אין תבנית לדירה ולסוג החוזה האלה. העלו תבנית בעמוד החוזים.');
  const doc = new Docxtemplater(new PizZip(await file.arrayBuffer()), { paragraphLoop: true, linebreaks: true });
  doc.render(data);
  return doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** PDF via the browser: render the .docx in a new window and open the print dialog ("Save as PDF"). */
export async function printAsPdf(blob: Blob, title: string) {
  const w = window.open('', '_blank');
  if (!w) throw new Error('הדפדפן חסם חלון חדש. אפשרו חלונות קופצים לאתר ונסו שוב.');
  w.document.write(`<!doctype html><html lang="he" dir="rtl"><head><title>${title}</title><style>body{margin:0;background:#fff}@media print{.docx-wrapper{background:none!important;padding:0!important}.docx{box-shadow:none!important;margin:0!important}}</style></head><body></body></html>`);
  w.document.close();
  const { renderAsync } = await import('docx-preview');
  await renderAsync(blob, w.document.body, w.document.head, { inWrapper: true, ignoreLastRenderedPageBreak: true });
  setTimeout(() => w.print(), 300);
}
