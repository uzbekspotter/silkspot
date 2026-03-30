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

  // 2. Upload file directly to R2 via presigned URL
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress?.(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(file);
  });

  const publicUrl = `/r2/${path}`;
  return { url: publicUrl, path, size: file.size, source: 'r2' };
}

// Transform any R2 URL (direct or old) to proxied URL through Vercel
export function proxyImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('/r2/')) return url;
  if (url.startsWith('blob:')) return url;
  const r2Match = url.match(/r2\.dev\/(.+)$/);
  if (r2Match) return `/r2/${r2Match[1]}`;
  if (url.startsWith('photos/')) return `/r2/${url}`;
  return url;
}

export async function deletePhoto(path: string): Promise<void> {
  await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
}
