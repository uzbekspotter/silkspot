// ── storage.ts ────────────────────────────────────────────────
// Photo upload service — Cloudflare R2 via Worker
//
// Flow:
//   1. Frontend отправляет файл на Worker через FormData
//   2. Worker загружает файл в R2 bucket
//   3. Worker возвращает публичный URL
//   4. Публичный URL сохраняется в Supabase
// ─────────────────────────────────────────────────────────────

export interface UploadResult {
  url:      string;   // публичный URL фото в R2
  path:     string;   // путь внутри bucket
  size:     number;   // размер в байтах
  source:   'r2' | 'demo';
}

const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

function buildPath(reg: string, file: File): string {
  const now  = new Date();
  const year = now.getFullYear();
  const mon  = String(now.getMonth() + 1).padStart(2, '0');
  const ts   = Date.now();
  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeReg = reg.replace(/[^A-Z0-9]/gi, '-').toUpperCase();
  return `photos/${year}/${mon}/${safeReg}_${ts}.${ext}`;
}

export async function uploadPhoto(
  file:       File,
  reg:        string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const path = buildPath(reg, file);

  if (!WORKER_URL) {
    console.warn('[storage] WORKER_URL not configured — using demo mode (blob URL)');
    const url = URL.createObjectURL(file);
    return { url, path, size: file.size, source: 'demo' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);

  const result = await new Promise<{ url: string; path: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${WORKER_URL}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error('Invalid response from upload worker'));
        }
      } else {
        let msg = `Upload failed (${xhr.status})`;
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch {}
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });

  return { url: result.url, path: result.path, size: file.size, source: 'r2' };
}

export async function deletePhoto(path: string): Promise<void> {
  if (!WORKER_URL) return;
  await fetch(`${WORKER_URL}/delete`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ path }),
  });
}
