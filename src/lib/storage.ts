// ── storage.ts ────────────────────────────────────────────────
// Photo upload service — Cloudflare R2 via Vercel API + presigned URL
//
// Flow:
//   1. Frontend → /api/presign (Vercel serverless) → gets presigned PUT URL
//   2. Frontend → PUT file directly to R2 (fast path)
//   3. If direct PUT fails (e.g. ERR_CONNECTION_RESET): POST same bytes to /api/upload (Vercel → R2)
//   4. Public URL saved to Supabase
// ─────────────────────────────────────────────────────────────

/** Below Vercel serverless body limit (~4.5 MB) — larger files must use direct PUT only */
const MAX_PROXY_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Do not use a 2-minute minimum XHR timeout — stalled TCP then blocks the UI for minutes per attempt. */
function xhrTimeoutDirectMs(fileSize: number): number {
  const cap = 95_000;
  const floor = 32_000;
  const fromSize = Math.floor(fileSize / 2048);
  return Math.min(cap, Math.max(floor, 38_000 + fromSize));
}

function xhrTimeoutProxyMs(fileSize: number): number {
  const cap = 180_000;
  const floor = 55_000;
  const fromSize = Math.floor(fileSize / 1024);
  return Math.min(cap, Math.max(floor, 50_000 + fromSize));
}

export interface UploadResult {
  url:      string;
  path:     string;
  size:     number;
  source:   'r2' | 'demo';
}

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

async function readPresignFailureMessage(res: Response): Promise<string> {
  const status = res.status;
  let raw = '';
  try {
    raw = await res.text();
  } catch {
    raw = '';
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const j = JSON.parse(trimmed) as { error?: unknown; message?: string };
      if (typeof j.error === 'string') return j.error;
      if (j.error && typeof j.error === 'object' && j.error !== null && 'message' in j.error) {
        const m = (j.error as { message?: string }).message;
        if (typeof m === 'string' && m.trim()) return m.trim();
      }
      if (typeof j.message === 'string' && j.message.trim()) return j.message.trim();
    } catch {
      /* ignore */
    }
  }
  const looksHtml = trimmed.startsWith('<') || /<!DOCTYPE/i.test(trimmed);
  if (looksHtml) {
    return `Could not get upload URL (HTTP ${status}). The server returned HTML instead of JSON — /api/presign is probably not running (e.g. SPA rewrite sent index.html). Deploy the latest vercel.json and confirm POST /api/presign returns JSON in the Network tab.`;
  }
  if (trimmed.length > 0) {
    const clip = trimmed.slice(0, 240);
    return `Could not get upload URL (HTTP ${status}). ${clip}${trimmed.length > 240 ? '…' : ''}`;
  }
  return `Could not get upload URL (HTTP ${status}). Empty response — check Vercel logs and R2_* env vars.`;
}

function buildPath(reg: string, file: File): string {
  const now  = new Date();
  const year = now.getFullYear();
  const mon  = String(now.getMonth() + 1).padStart(2, '0');
  const ts   = Date.now();
  const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeReg = reg.replace(/[^A-Z0-9]/gi, '-').toUpperCase();
  return `photos/${year}/${mon}/${safeReg}_${ts}.${ext}`;
}

function putFileToSignedUrl(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.timeout = xhrTimeoutDirectMs(file.size);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      console.warn(
        '[storage] Direct PUT to R2 failed. If this persists, upload will retry via /api/upload (Vercel → R2).'
      );
      reject(
        new Error(
          'Direct upload to storage was interrupted (browser → R2). Try again or another network. If this keeps happening on a stable connection, add this site’s exact URL to the R2 bucket CORS allowlist — see docs/r2-bucket-cors.json.',
        ),
      );
    };
    xhr.ontimeout = () => reject(new Error('Upload timed out — file may be too large for this connection.'));
    xhr.onabort = () => reject(new Error('Upload was cancelled.'));

    xhr.send(file);
  });
}

async function putFileToR2WithRetries(
  uploadUrl: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const maxAttempts = 2;
  const baseDelayMs = 400;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await putFileToSignedUrl(uploadUrl, file, onProgress);
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const retriable =
        attempt < maxAttempts &&
        (lastError.message.includes('timed out') || lastError.message.includes('HTTP 5'));
      if (!retriable) throw lastError;
      onProgress?.(0);
      await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
    }
  }

  if (lastError) throw lastError;
}

function putFileViaVercelProxy(
  path: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('X-Upload-Path', encodeURIComponent(path));
    xhr.timeout = xhrTimeoutProxyMs(file.size);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let msg = `Server upload failed (${xhr.status})`;
      try {
        const j = JSON.parse(xhr.responseText) as { error?: string };
        if (j.error) msg = j.error;
      } catch {
        /* ignore */
      }
      reject(new Error(msg));
    };

    xhr.onerror = () => reject(new Error('Server upload connection failed'));
    xhr.ontimeout = () => reject(new Error('Server upload timed out'));
    xhr.send(file);
  });
}

function uploadErrorAfterProxyFailure(directMessage: string, proxyErr: unknown): Error {
  const p = proxyErr instanceof Error ? proxyErr : new Error(String(proxyErr));
  return new Error(
    `${directMessage}\n\nUpload via your site’s server also failed (${p.message}). Check that the deployment is up, /api/upload is reachable, and (for large files) direct R2 upload must work.`,
  );
}

export async function uploadPhoto(
  file:       File,
  reg:        string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const path = buildPath(reg, file);

  if (!R2_PUBLIC_URL) {
    console.warn('[storage] R2 not configured — demo mode');
    const url = URL.createObjectURL(file);
    return { url, path, size: file.size, source: 'demo' };
  }

  // 1. Get presigned URL from our Vercel API
  const presignRes = await fetch('/api/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contentType: file.type }),
  });

  if (!presignRes.ok) {
    throw new Error(await readPresignFailureMessage(presignRes));
  }

  const { uploadUrl } = (await presignRes.json()) as { uploadUrl: string };

  try {
    await putFileToR2WithRetries(uploadUrl, file, onProgress);
  } catch (directErr) {
    const err = directErr instanceof Error ? directErr : new Error(String(directErr));
    if (file.size > MAX_PROXY_UPLOAD_BYTES) {
      throw err;
    }
    console.warn('[storage] Using Vercel → R2 proxy after direct upload failed:', err.message);
    onProgress?.(0);
    try {
      await putFileViaVercelProxy(path, file, onProgress);
    } catch (proxyErr) {
      throw uploadErrorAfterProxyFailure(err.message, proxyErr);
    }
  }

  const publicUrl = `/r2/${path}`;
  return { url: publicUrl, path, size: file.size, source: 'r2' };
}

function buildAvatarPath(userId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  return `avatars/${userId}_${Date.now()}.${safeExt}`;
}

/** Avatar to R2: presign + direct PUT, then `/api/upload` proxy (same as batch photos). */
export async function uploadAvatarFile(
  file: File,
  userId: string,
  onProgress?: (pct: number) => void,
): Promise<{ path: string }> {
  const path = buildAvatarPath(userId, file);

  if (!R2_PUBLIC_URL) {
    throw new Error('Photo storage is not configured. Avatar upload is unavailable.');
  }

  const presignRes = await fetch('/api/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, contentType: file.type || 'image/jpeg' }),
  });

  if (!presignRes.ok) {
    throw new Error(await readPresignFailureMessage(presignRes));
  }

  const { uploadUrl } = (await presignRes.json()) as { uploadUrl: string };

  try {
    await putFileToR2WithRetries(uploadUrl, file, onProgress);
  } catch (directErr) {
    const err = directErr instanceof Error ? directErr : new Error(String(directErr));
    if (file.size > MAX_PROXY_UPLOAD_BYTES) {
      throw err;
    }
    console.warn('[storage] Avatar: using Vercel → R2 proxy after direct upload failed:', err.message);
    onProgress?.(0);
    try {
      await putFileViaVercelProxy(path, file, onProgress);
    } catch (proxyErr) {
      throw uploadErrorAfterProxyFailure(err.message, proxyErr);
    }
  }

  return { path };
}

// Transform any R2 URL (direct or old) to proxied URL through Vercel
export function proxyImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/r2/')) return url;
  if (url.startsWith('blob:')) return url;
  if (url.startsWith('data:')) return url;
  if (/^https?:\/\//i.test(url)) {
    const r2Match = url.match(/r2\.dev\/(.+)$/);
    if (r2Match) return `/r2/${r2Match[1]}`;
    return url;
  }
  if (url.startsWith('/')) return url;
  const r2Match = url.match(/r2\.dev\/(.+)$/);
  if (r2Match) return `/r2/${r2Match[1]}`;
  // Any plain storage key (photos/, avatars/, covers/, etc.) goes through proxy.
  return `/r2/${url.replace(/^\/+/, '')}`;
}

/** Cache-bust avatar URLs when the storage key changes (edge/CDN may ignore query on R2 proxy). */
export function proxyAvatarUrl(urlOrKey: string): string {
  if (!urlOrKey) return '';
  if (urlOrKey.startsWith('blob:') || urlOrKey.startsWith('data:')) return urlOrKey;
  const base = proxyImageUrl(urlOrKey);
  const bare = urlOrKey
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/?r2\//i, '')
    .split('?')[0];
  if (!bare.startsWith('avatars/')) return base;
  const ts = bare.match(/_(\d+)\.[^.]+$/i)?.[1];
  const q = ts ? `v=${ts}` : `v=${encodeURIComponent(bare.slice(-48))}`;
  return base.includes('?') ? `${base}&${q}` : `${base}?${q}`;
}

export async function deletePhoto(path: string): Promise<void> {
  await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}
