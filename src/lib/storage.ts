// ── storage.ts ────────────────────────────────────────────────
// Photo upload service — Cloudflare R2 via presigned URLs
//
// Flow:
//   1. Frontend запрашивает presigned URL у нашего edge-функции
//   2. Файл загружается напрямую с браузера в R2 (без сервера)
//   3. Публичный URL сохраняется в Supabase таблице photos
//
// Пока Cloudflare R2 не подключён — работает в demo-режиме
// (фото хранятся как blob URL только в памяти браузера)
// ─────────────────────────────────────────────────────────────

export interface UploadResult {
  url:      string;   // публичный URL фото в R2
  path:     string;   // путь внутри bucket
  size:     number;   // размер в байтах
  source:   'r2' | 'demo';
}

// Cloudflare R2 публичный домен (заполнишь после настройки R2)
const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

// Наш Worker URL для получения presigned URL (заполнишь позже)
const WORKER_URL = import.meta.env.VITE_WORKER_URL || '';

// ── Генерация пути файла в bucket ────────────────────────────
// Формат: photos/2025/07/UK32101_1720000000000.jpg
function buildPath(reg: string, file: File): string {
  const now  = new Date();
  const year = now.getFullYear();
  const mon  = String(now.getMonth() + 1).padStart(2, '0');
  const ts   = Date.now();
  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeReg = reg.replace(/[^A-Z0-9]/gi, '-').toUpperCase();
  return `photos/${year}/${mon}/${safeReg}_${ts}.${ext}`;
}

// ── Загрузка через Cloudflare R2 ─────────────────────────────
async function uploadToR2(
  file: File,
  path: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  // 1. Получаем presigned URL от нашего Worker
  const res = await fetch(`${WORKER_URL}/presign`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ path, contentType: file.type }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { uploadUrl } = await res.json();

  // 2. Загружаем файл напрямую в R2
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress?.(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload  = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });

  return `${R2_PUBLIC_URL}/${path}`;
}

// ── Основная функция загрузки ─────────────────────────────────
export async function uploadPhoto(
  file:       File,
  reg:        string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const path = buildPath(reg, file);

  // Если R2 не настроен — работаем в demo-режиме
  if (!R2_PUBLIC_URL || !WORKER_URL) {
    console.warn('[storage] R2 not configured — using demo mode (blob URL)');
    const url = URL.createObjectURL(file);
    return { url, path, size: file.size, source: 'demo' };
  }

  const url = await uploadToR2(file, path, onProgress);
  return { url, path, size: file.size, source: 'r2' };
}

// ── Удаление фото из R2 ───────────────────────────────────────
export async function deletePhoto(path: string): Promise<void> {
  if (!WORKER_URL) return;
  await fetch(`${WORKER_URL}/delete`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ path }),
  });
}
