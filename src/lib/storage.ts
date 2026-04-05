// ── storage.ts ────────────────────────────────────────────────
// Photo upload service — Cloudflare R2 via Vercel API + presigned URL
//
// Flow:
//   1. Frontend → /api/presign (Vercel serverless) → gets presigned PUT URL
//   2. Frontend → PUT file directly to R2 (no server in between)
//   3. Public URL saved to Supabase
// ─────────────────────────────────────────────────────────────

export interface UploadResult {
  url:      string;
  path:     string;
  size:     number;
  source:   'r2' | 'demo';
}

const R2_PUBLIC_URL = import.meta.env.VITE_R2_PUBLIC_URL || '';

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
    const err = await presignRes.json().catch(() => ({ error: 'Failed to get upload URL' }));
    throw new Error(err.error || `Presign failed (${presignRes.status})`);
  }

  const { uploadUrl } = await presignRes.json();

  // 2. Upload file directly to R2 via presigned URL (retries help with transient TCP resets / middleboxes)
  const maxAttempts = 3;
  const baseDelayMs = 900;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.timeout = Math.min(600_000, Math.max(120_000, file.size / 5000));

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
            '[storage] Direct PUT to R2 failed. Fix: R2 bucket CORS must allow this page origin, PUT, and Content-Type (see docs/r2-bucket-cors.json). Also try without VPN / another network.'
          );
          reject(
            new Error(
              'Upload failed — connection was interrupted. Try again or another network. If it keeps happening, the storage bucket needs CORS for this site (see docs/r2-bucket-cors.json in the repo).'
            )
          );
        };
        xhr.ontimeout = () => reject(new Error('Upload timed out — file may be too large for this connection.'));
        xhr.onabort = () => reject(new Error('Upload was cancelled.'));

        xhr.send(file);
      });
      lastError = null;
      break;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const retriable =
        attempt < maxAttempts &&
        (lastError.message.includes('interrupted') ||
          lastError.message.includes('timed out') ||
          lastError.message.includes('HTTP 5'));
      if (!retriable) throw lastError;
      onProgress?.(0);
      await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
    }
  }

  if (lastError) throw lastError;

  const publicUrl = `/r2/${path}`;
  return { url: publicUrl, path, size: file.size, source: 'r2' };
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

export async function deletePhoto(path: string): Promise<void> {
  await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}
