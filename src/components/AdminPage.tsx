import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Eye, Camera, Clock, User, Flag, Star, BarChart3, Shield, ChevronRight, X, Maximize2, Search, Download, Check, Users, LogOut, Sliders, Loader2, Trash2, Ban, Cloud, UserX } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { proxyImageUrl, deletePhoto as deleteR2Photo } from '../lib/storage';
import { PhotoReviewTools } from './PhotoReviewTools';

type PhotoStatus = 'PENDING'|'APPROVED'|'REJECTED';
type QueueTab    = 'pending'|'approved'|'rejected';
type AdminTab    = 'moderation'|'users'|'stats';

interface QueuePhoto {
  id: string;
  storage_path: string;
  shot_date: string;
  category: string;
  status: PhotoStatus;
  metadata_score: number;
  notes: string | null;
  created_at: string;
  file_size_kb: number | null;
  width_px: number | null;
  height_px: number | null;
  rejection_reason: string | null;
  aircraft: { registration: string } | null;
  uploader: { id: string; username: string; display_name: string | null; rank: string; approved_uploads: number } | null;
  operator: { name: string; iata: string | null } | null;
  airport: { iata: string | null; name: string } | null;
}

const REJECTION_REASONS = [
  'Low image quality / out of focus',
  'Aircraft not clearly visible',
  'Heavy watermark or signature',
  'Incorrect metadata / wrong registration',
  'Duplicate submission',
  'Does not meet resolution requirements',
  'Copyright violation',
  'Custom reason…',
];

/** Admin Rank dropdown: upload ladder + honorary roles + reset to formula */
const ADMIN_RANK_OPTIONS: { value: string; label: string }[] = [
  { value: '__AUTO__', label: 'Auto (by uploads)' },
  { value: 'Observer', label: 'Observer' },
  { value: 'Reporter', label: 'Reporter' },
  { value: 'Contributor', label: 'Contributor' },
  { value: 'Spotter', label: 'Spotter' },
  { value: 'Senior', label: 'Senior' },
  { value: 'Expert', label: 'Expert' },
  { value: 'Master', label: 'Master' },
  { value: 'Legend', label: 'Legend' },
  { value: 'Screener', label: 'Screener' },
  { value: 'Staff', label: 'Staff' },
];

function rankFromApprovedUploads(up: number): string {
  if (up >= 5000) return 'Legend';
  if (up >= 2500) return 'Master';
  if (up >= 1000) return 'Expert';
  if (up >= 500) return 'Senior';
  if (up >= 200) return 'Spotter';
  if (up >= 50) return 'Contributor';
  if (up >= 10) return 'Reporter';
  return 'Observer';
}

const ScoreRing = ({score}:{score:number}) => {
  const color = score>=80?'#34c759':score>=60?'#ff9500':'#ff3b30';
  const r=20,circ=2*Math.PI*r;
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="#f8fafc" strokeWidth="4"/>
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)} style={{transition:'stroke-dashoffset 0.5s ease'}}/>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold" style={{color,fontFamily:'"SF Mono",monospace'}}>{score}</span>
      </div>
    </div>
  );
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatStorageBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

type R2MetricsPayload = {
  payloadBytes: number;
  metadataBytes: number;
  objectCount: number;
  totalStoredBytes: number;
  capGb: number;
  capBytes: number;
  capSource: 'env' | 'default';
  remainingBytes: number;
  note?: string;
};

export const AdminPage = ({
  onPhotoClick,
  canUseReviewTools = true,
}: {
  onPhotoClick?: (id: string) => void;
  /** When true (Admin / Moderator / Screener), show full Review Tools for accept–reject. */
  canUseReviewTools?: boolean;
}) => {
  const [adminTab,  setAdminTab]  = useState<AdminTab>('moderation');
  const [queueTab,  setQueueTab]  = useState<QueueTab>('pending');
  const [selected,  setSelected]  = useState<QueuePhoto|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [photos,    setPhotos]    = useState<QueuePhoto[]>([]);
  const [search,    setSearch]    = useState('');
  const [lightbox,  setLightbox]  = useState(false);
  const [acting,    setActing]    = useState(false);

  const [rejectReason,    setRejectReason]    = useState('');
  const [customReason,    setCustomReason]    = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [currentRole, setCurrentRole] = useState<'user'|'moderator'|'admin'|'screener'>('user');
  const [userDrafts, setUserDrafts] = useState<Record<string, {
    role: string;
    rankSelectValue: string;
    isBanned: boolean;
    dirty: boolean;
    saving: boolean;
  }>>({});

  const [r2Metrics, setR2Metrics] = useState<R2MetricsPayload | null>(null);
  const [r2MetricsError, setR2MetricsError] = useState<string | null>(null);
  const [r2MetricsErrorCode, setR2MetricsErrorCode] = useState<string | null>(null);
  const [r2MetricsLoading, setR2MetricsLoading] = useState(false);
  const [adminSelfId, setAdminSelfId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setAdminSelfId(u?.id ?? null)).catch(() => setAdminSelfId(null));
  }, []);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('photos')
      .select(`
        id, storage_path, shot_date, category, status, metadata_score, notes,
        created_at, file_size_kb, width_px, height_px, rejection_reason,
        aircraft(registration),
        uploader:user_profiles!uploader_id(id, username, display_name, rank, approved_uploads),
        operator:airlines(name, iata),
        airport:airports(iata, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Failed to load photos:', error);
    } else {
      setPhotos((data ?? []) as QueuePhoto[]);
      if (!selected && data && data.length > 0) {
        const pending = data.find((p: any) => p.status === 'PENDING');
        setSelected((pending ?? data[0]) as QueuePhoto);
      }
    }
    setLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('approved_uploads', { ascending: false })
      .limit(50);
    setRealUsers(data ?? []);
  }, []);

  const loadCurrentRole = useCallback(async () => {
    const me = await getCurrentUser();
    if (!me) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', me.id)
      .maybeSingle();
    const role = String(data?.role || '').toLowerCase();
    if (role === 'admin' || role === 'moderator' || role === 'screener') {
      setCurrentRole(role);
    } else {
      setCurrentRole('user');
    }
  }, []);

  useEffect(() => { loadCurrentRole(); loadPhotos(); }, [loadCurrentRole, loadPhotos]);
  useEffect(() => {
    if (currentRole === 'admin') loadUsers();
  }, [currentRole, loadUsers]);

  useEffect(() => {
    if (adminTab !== 'stats') return;
    let cancelled = false;
    (async () => {
      setR2MetricsLoading(true);
      setR2MetricsError(null);
      setR2MetricsErrorCode(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        if (!cancelled) {
          setR2MetricsError('Not signed in');
          setR2MetricsLoading(false);
        }
        return;
      }
      try {
        const res = await fetch('/api/r2-metrics', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = (await res.json().catch(() => ({}))) as R2MetricsPayload & { error?: string; code?: string };
        if (cancelled) return;
        if (!res.ok) {
          setR2Metrics(null);
          setR2MetricsError(body.error || `Request failed (${res.status})`);
          setR2MetricsErrorCode(body.code ?? null);
        } else {
          const capGb = typeof body.capGb === 'number' ? body.capGb : 10;
          const capBytes =
            typeof body.capBytes === 'number' ? body.capBytes : Math.round(capGb * 1024 ** 3);
          setR2Metrics({
            payloadBytes: body.payloadBytes ?? 0,
            metadataBytes: body.metadataBytes ?? 0,
            objectCount: body.objectCount ?? 0,
            totalStoredBytes: body.totalStoredBytes ?? 0,
            capGb,
            capBytes,
            capSource: body.capSource === 'env' ? 'env' : 'default',
            remainingBytes:
              typeof body.remainingBytes === 'number'
                ? body.remainingBytes
                : Math.max(0, capBytes - (body.totalStoredBytes ?? 0)),
            note: body.note,
          });
        }
      } catch {
        if (!cancelled) setR2MetricsError('Network error');
      } finally {
        if (!cancelled) setR2MetricsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminTab]);

  const baseUserDraft = useCallback((u: any) => ({
    role: u.role || 'SPOTTER',
    rankSelectValue: u.rank_manual === true ? (u.rank || 'Observer') : '__AUTO__',
    isBanned: u.is_banned === true,
    dirty: false,
    saving: false,
  }), []);

  useEffect(() => {
    setUserDrafts(prev => {
      const next: typeof prev = {};
      for (const u of realUsers) {
        const base = baseUserDraft(u);
        const existing = prev[u.id];
        if (existing?.dirty || existing?.saving) {
          next[u.id] = existing;
        } else {
          next[u.id] = base;
        }
      }
      return next;
    });
  }, [realUsers, baseUserDraft]);

  const updateUserDraft = useCallback((u: any, patch: Partial<{
    role: string;
    rankSelectValue: string;
    isBanned: boolean;
  }>) => {
    setUserDrafts(prev => {
      const base = baseUserDraft(u);
      const cur = prev[u.id] || base;
      const merged = { ...cur, ...patch };
      const dirty =
        merged.role !== base.role ||
        merged.rankSelectValue !== base.rankSelectValue ||
        merged.isBanned !== base.isBanned;
      return { ...prev, [u.id]: { ...merged, dirty } };
    });
  }, [baseUserDraft]);

  const saveUserDraft = useCallback(async (u: any) => {
    const d = userDrafts[u.id];
    if (!d || !d.dirty || d.saving) return;

    const base = baseUserDraft(u);
    setUserDrafts(prev => ({ ...prev, [u.id]: { ...d, saving: true } }));

    try {
      if (d.role !== base.role) {
        const { error: err } = await supabase.rpc('admin_set_user_role', { target_id: u.id, new_role: d.role });
        if (err) {
          const hint = err.message?.includes('invalid input value for enum user_role')
            ? '\nRun SQL migration supabase/migrations/013_add_screener_role.sql in Supabase SQL Editor.'
            : '';
          throw new Error('Role: ' + err.message + hint);
        }
      }

      if (d.rankSelectValue !== base.rankSelectValue) {
        const up = u.approved_uploads || 0;
        const nextRank = d.rankSelectValue === '__AUTO__' ? rankFromApprovedUploads(up) : d.rankSelectValue;
        const nextManual = d.rankSelectValue !== '__AUTO__';
        const { error: err } = await supabase
          .from('user_profiles')
          .update({ rank: nextRank, rank_manual: nextManual })
          .eq('id', u.id);
        if (err) {
          throw new Error('Rank: ' + err.message + (err.message.includes('rank_manual') ? '\nRun SQL from supabase/migrations/006_admin_rank.sql.' : ''));
        }
      }

      if (d.isBanned !== base.isBanned) {
        const { error: err } = await supabase.rpc('admin_set_user_ban', { target_id: u.id, banned: d.isBanned });
        if (err) throw new Error('Ban: ' + err.message);
      }

      await loadUsers();
      setUserDrafts(prev => ({ ...prev, [u.id]: { ...(prev[u.id] || d), dirty: false, saving: false } }));
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || 'Unknown error'));
      setUserDrafts(prev => ({ ...prev, [u.id]: { ...(prev[u.id] || d), saving: false } }));
    }
  }, [userDrafts, baseUserDraft, loadUsers]);

  const deleteUserAccount = useCallback(
    async (u: { id: string; username: string }) => {
      if (u.id === adminSelfId) {
        alert('You cannot delete your own account from this panel.');
        return;
      }
      if (
        !window.confirm(
          `Permanently remove @${u.username}? Their login, profile, forum posts, and all photo rows in the database will be deleted. Files in R2 may remain until cleaned up separately.`
        )
      ) {
        return;
      }
      const typed = window.prompt(`Type DELETE (all caps) to confirm removal of @${u.username}:`);
      if (typed !== 'DELETE') return;

      setDeletingUserId(u.id);
      try {
        const { error } = await supabase.rpc('admin_delete_user_account', { p_target: u.id });
        if (error) throw error;
        setRealUsers((prev) => prev.filter((x) => x.id !== u.id));
        setUserDrafts((prev) => {
          const next = { ...prev };
          delete next[u.id];
          return next;
        });
        setSelected((s) => (s?.uploader?.id === u.id ? null : s));
        await loadPhotos();
      } catch (e: unknown) {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Unknown error';
        alert('Could not delete user: ' + msg);
      } finally {
        setDeletingUserId(null);
      }
    },
    [adminSelfId, loadPhotos]
  );

  const queueFiltered = useMemo(() => {
    let list = photos.filter(p => {
      if (queueTab === 'pending')  return p.status === 'PENDING';
      if (queueTab === 'approved') return p.status === 'APPROVED';
      if (queueTab === 'rejected') return p.status === 'REJECTED';
      return true;
    });
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.aircraft?.registration?.toLowerCase().includes(q) ||
        p.uploader?.username?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [photos, queueTab, search]);

  const pendingCount  = photos.filter(p => p.status === 'PENDING').length;
  const approvedCount = photos.filter(p => p.status === 'APPROVED').length;
  const rejectedCount = photos.filter(p => p.status === 'REJECTED').length;

  const updatePhotoStatus = async (photo: QueuePhoto, newStatus: PhotoStatus, reason?: string) => {
    setActing(true);
    const user = await getCurrentUser();

    const updates: Record<string, any> = {
      status: newStatus,
      moderated_by: user?.id,
      moderated_at: new Date().toISOString(),
    };
    if (reason) updates.rejection_reason = reason;

    const { error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', photo.id);

    if (error) {
      console.error('Failed to update photo:', error);
      alert('Failed to update: ' + error.message);
    } else {
      setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, status: newStatus, rejection_reason: reason || null } : p));
      const next = photos.find(q => q.id !== photo.id && q.status === 'PENDING');
      setSelected(next ?? null);
    }
    setActing(false);
  };

  const approve = (p: QueuePhoto) => updatePhotoStatus(p, 'APPROVED');

  const confirmReject = () => {
    if (!selected) return;
    const reason = rejectReason === 'Custom reason…' ? customReason : rejectReason;
    updatePhotoStatus(selected, 'REJECTED', reason);
    setShowRejectModal(false);
    setRejectReason('');
    setCustomReason('');
  };

  const undoDecision = (p: QueuePhoto) => updatePhotoStatus(p, 'PENDING');

  const deletePhotoFull = async (photo: QueuePhoto) => {
    if (!confirm(`Delete photo ${reg(photo)} permanently? This cannot be undone.`)) return;
    setActing(true);
    try {
      if (photo.storage_path) await deleteR2Photo(photo.storage_path);
      const { error: dbErr } = await supabase.from('photos').delete().eq('id', photo.id);
      if (dbErr) throw dbErr;
      setPhotos(prev => prev.filter(p => p.id !== photo.id));
      if (selected?.id === photo.id) setSelected(null);
    } catch (err: any) {
      alert('Delete failed: ' + (err?.message || 'Unknown error'));
    }
    setActing(false);
  };

  const QTABS = [
    {id:'pending' as QueueTab, label:'Pending', count:pendingCount, color:'#ff9500'},
    {id:'approved' as QueueTab, label:'Approved', count:approvedCount, color:'#34c759'},
    {id:'rejected' as QueueTab, label:'Rejected', count:rejectedCount, color:'#94a3b8'},
  ];
  const ATABS = [
    {id:'moderation' as AdminTab, label:'Moderation Queue'},
    {id:'users' as AdminTab, label:'User Management'},
    {id:'stats' as AdminTab, label:'Platform Stats'},
  ];
  const canManageUsers = currentRole === 'admin';
  const visibleTabs = ATABS.filter(t => t.id !== 'users' || canManageUsers);

  const reg = (p: QueuePhoto) => p.aircraft?.registration || '?';
  const spotterName = (p: QueuePhoto) => p.uploader?.display_name || p.uploader?.username || '?';
  const airportCode = (p: QueuePhoto) => p.airport?.iata || '—';
  const operatorName = (p: QueuePhoto) => p.operator?.name || '—';

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{background:'transparent',minHeight:'100vh'}} className="relative z-10">

      {/* Reject modal */}
      <AnimatePresence>
        {showRejectModal&&selected&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[200] flex items-center justify-center px-4"
            style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(8px)'}} onClick={()=>setShowRejectModal(false)}>
            <motion.div initial={{scale:0.95,y:10}} animate={{scale:1,y:0}}
              onClick={e=>e.stopPropagation()}
              className="w-full max-w-md rounded-2xl p-6"
              style={{background:'#fff',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
              <h3 className="font-headline text-xl font-semibold mb-1 tracking-tight" style={{color:'#0f172a'}}>Reject Photo</h3>
              <p className="text-sm mb-5" style={{color:'#475569'}}>{reg(selected)} · {spotterName(selected)}</p>
              <div className="space-y-2 mb-4">
                {REJECTION_REASONS.map(r=>(
                  <button key={r} onClick={()=>setRejectReason(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm text-left transition-all"
                    style={{background:rejectReason===r?'#fef2f2':'#f8fafc',color:rejectReason===r?'#dc2626':'#0f172a',border:rejectReason===r?'1px solid rgba(220,38,38,0.2)':'1px solid transparent'}}>
                    <div className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                      style={{borderColor:rejectReason===r?'#dc2626':'#e2e8f0'}}>
                      {rejectReason===r&&<div className="w-2 h-2 rounded-full" style={{background:'#dc2626'}}/>}
                    </div>
                    {r}
                  </button>
                ))}
              </div>
              {rejectReason==='Custom reason…'&&(
                <textarea value={customReason} onChange={e=>setCustomReason(e.target.value)} placeholder="Describe the issue…" rows={3} className="mb-4" style={{resize:'vertical'}}/>
              )}
              <div className="flex gap-3">
                <button onClick={()=>setShowRejectModal(false)} className="btn-outline flex-1 justify-center" style={{height:44,fontSize:14}}>Cancel</button>
                <button onClick={confirmReject}
                  disabled={!rejectReason||(rejectReason==='Custom reason…'&&!customReason)||acting}
                  className="flex-1 rounded-full font-medium text-sm transition-all justify-center flex items-center"
                  style={{height:44,background:rejectReason?'#dc2626':'#f8fafc',color:rejectReason?'#fff':'#94a3b8',cursor:rejectReason?'pointer':'not-allowed'}}>
                  {acting ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Reject Photo'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox&&selected&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{background:'rgba(0,0,0,0.94)'}}
            onClick={()=>setLightbox(false)}>
            <img src={proxyImageUrl(selected.storage_path)} className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain" referrerPolicy="no-referrer"/>
            <button onClick={()=>setLightbox(false)} className="absolute top-5 right-5 p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)',color:'#fff'}}>
              <X className="w-5 h-5"/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <section style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div className="site-w py-10">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Admin</div>
              <h1 className="font-headline text-4xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Moderation Center</h1>
            </div>
            <div className="flex items-center gap-0">
              {[
                {label:'Pending', val:pendingCount, color:'#ff9500'},
                {label:'Approved', val:approvedCount, color:'#34c759'},
                {label:'Rejected', val:rejectedCount, color:'#ff3b30'},
                {label:'Total', val:photos.length, color:'#0ea5e9'},
              ].map((s,i,arr)=>(
                <div key={s.label} className="px-6 py-3 text-center" style={{borderRight:i<arr.length-1?'1px solid #e2e8f0':'none'}}>
                  <div className="text-xl font-semibold tracking-tight" style={{color:s.color,fontFamily:'"SF Mono",monospace'}}>{s.val}</div>
                  <div className="text-xs mt-0.5" style={{color:'#94a3b8'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-0">
            {visibleTabs.map(t=>(
              <button key={t.id} onClick={()=>setAdminTab(t.id)}
                className="text-sm px-5 py-3 transition-all"
                style={{color:adminTab===t.id?'#0f172a':'#475569',borderBottom:adminTab===t.id?'2px solid #0f172a':'2px solid transparent',fontWeight:adminTab===t.id?500:400,background:'transparent'}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="site-w py-8">

        {/* MODERATION */}
        {adminTab==='moderation'&&(
          loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{color:'#94a3b8'}}/>
                <p className="text-sm" style={{color:'#94a3b8'}}>Loading queue...</p>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

            {/* Queue */}
            <div className="xl:col-span-4 space-y-4">
              <div className="flex gap-1 p-1 rounded-2xl" style={{background:'#f8fafc'}}>
                {QTABS.map(t=>(
                  <button key={t.id} onClick={()=>setQueueTab(t.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all"
                    style={{background:queueTab===t.id?'#fff':'transparent',color:queueTab===t.id?t.color:'#94a3b8',boxShadow:queueTab===t.id?'0 1px 4px rgba(0,0,0,0.08)':'none'}}>
                    <span style={{fontFamily:'"SF Mono",monospace'}}>{t.count}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:'#94a3b8'}}/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Reg, spotter…" style={{paddingLeft:44}}/>
              </div>
              <div className="space-y-2 no-scrollbar overflow-y-auto" style={{maxHeight:'calc(100vh - 380px)'}}>
                {queueFiltered.length===0?(
                  <div className="text-center py-12 card rounded-2xl" style={{color:'#94a3b8'}}>
                    <Shield className="w-8 h-8 mx-auto mb-3 opacity-20"/>
                    <div className="text-sm font-medium">Queue empty</div>
                  </div>
                ):queueFiltered.map((photo,i)=>{
                  const isSelected = selected?.id === photo.id;
                  const sc = photo.status==='APPROVED'?'#34c759':photo.status==='REJECTED'?'#ff3b30':'#ff9500';
                  return(
                    <motion.div key={photo.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                      className="card flex items-center gap-3 p-3 cursor-pointer"
                      style={{border:isSelected?'1px solid rgba(14,165,233,0.3)':'1px solid #e8e8ed',background:isSelected?'rgba(14,165,233,0.03)':'#fff',borderLeft:`3px solid ${sc}`}}
                      onClick={()=>setSelected(photo)}>
                      <div className="w-14 h-10 rounded-xl overflow-hidden shrink-0" style={{background:'#f1f5f9'}}>
                        {photo.storage_path && (
                          <img src={proxyImageUrl(photo.storage_path)} alt={reg(photo)} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm tracking-tight" style={{color:'#0f172a'}}>{reg(photo)}</span>
                        </div>
                        <div className="text-xs truncate" style={{color:'#94a3b8'}}>{spotterName(photo)} · {airportCode(photo)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{timeAgo(photo.created_at)}</span>
                        <ChevronRight className="w-3.5 h-3.5" style={{color:isSelected?'#0ea5e9':'#e2e8f0'}}/>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Detail */}
            <div className="xl:col-span-8">
              {!selected?(
                <div className="flex items-center justify-center h-96 rounded-2xl" style={{background:'#f8fafc',border:'1px solid #e8e8ed'}}>
                  <div className="text-center" style={{color:'#94a3b8'}}>
                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-20"/>
                    <p className="text-sm font-medium">Select a photo to review</p>
                  </div>
                </div>
              ):(
                <AnimatePresence mode="wait">
                  <motion.div key={selected.id} initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0}} transition={{duration:0.2}} className="space-y-5">

                    {/* Review tools: same panel for Admin, Moderator, Screener (see App.tsx canUseReviewTools) */}
                    {selected.storage_path ? (
                      canUseReviewTools ? (
                      <div className="space-y-2">
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setLightbox(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-2 py-1"
                            style={{ color: '#64748b' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#0f172a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Fullscreen
                          </button>
                        </div>
                        <PhotoReviewTools
                          key={selected.id}
                          photoUrl={proxyImageUrl(selected.storage_path)}
                          reg={reg(selected)}
                          width={selected.width_px ?? 1920}
                          height={selected.height_px ?? 1080}
                          sizeMb={Math.max(0.01, (selected.file_size_kb ?? 512) / 1024)}
                          metadataScore={selected.metadata_score ?? 0}
                          category={selected.category || '—'}
                          shotDate={selected.shot_date || '—'}
                          spotter={spotterName(selected)}
                        />
                      </div>
                      ) : (
                      <div className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={() => setLightbox(true)}>
                        <img src={proxyImageUrl(selected.storage_path)} alt={reg(selected)} className="w-full object-cover" style={{ maxHeight: 360 }} referrerPolicy="no-referrer" />
                        <div className="absolute bottom-0 left-0 right-0 p-5" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                          <h2 className="font-headline text-3xl font-bold tracking-tight mb-1" style={{ color: '#fff' }}>{reg(selected)}</h2>
                          <div className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{operatorName(selected)} · {airportCode(selected)}</div>
                        </div>
                      </div>
                      )
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden" style={{ background: '#f1f5f9' }}>
                        <div className="w-full flex items-center justify-center" style={{ height: 200 }}>
                          <div className="text-center" style={{ color: '#94a3b8' }}>
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">Image not available (demo upload)</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {selected.status==='PENDING'?(
                      <div className="flex items-center gap-3">
                        <button onClick={()=>approve(selected)} disabled={acting}
                          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium text-sm transition-all"
                          style={{background:'#f0fdf4',color:'#16a34a',border:'1px solid rgba(52,199,89,0.25)',opacity:acting?0.5:1}}>
                          {acting ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                          Approve
                        </button>
                        <button onClick={()=>setShowRejectModal(true)} disabled={acting}
                          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium text-sm transition-all"
                          style={{background:'#fef2f2',color:'#dc2626',border:'1px solid rgba(220,38,38,0.2)',opacity:acting?0.5:1}}>
                          <XCircle className="w-5 h-5"/>Reject
                        </button>
                        <button onClick={()=>deletePhotoFull(selected)} disabled={acting}
                          className="flex items-center justify-center gap-2 py-4 px-5 rounded-2xl font-medium text-sm transition-all"
                          style={{background:'#18181b',color:'#fff',opacity:acting?0.5:1}}>
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    ):(
                      <div className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{background:selected.status==='APPROVED'?'#f0fdf4':'#fef2f2',border:`1px solid ${selected.status==='APPROVED'?'rgba(52,199,89,0.25)':'rgba(220,38,38,0.2)'}`}}>
                        {selected.status==='APPROVED'?<CheckCircle2 className="w-5 h-5" style={{color:'#16a34a'}}/>:<XCircle className="w-5 h-5" style={{color:'#dc2626'}}/>}
                        <div className="flex-1">
                          <span className="font-medium text-sm" style={{color:selected.status==='APPROVED'?'#16a34a':'#dc2626'}}>
                            {selected.status==='APPROVED'?'Approved':'Rejected'}
                          </span>
                          {selected.rejection_reason && (
                            <p className="text-xs mt-1" style={{color:'#94a3b8'}}>{selected.rejection_reason}</p>
                          )}
                        </div>
                        <button onClick={()=>undoDecision(selected)} disabled={acting}
                          className="text-xs btn-secondary" style={{padding:'4px 12px',height:'auto'}}>
                          {acting ? <Loader2 className="w-3 h-3 animate-spin"/> : 'Undo'}
                        </button>
                        <button onClick={()=>deletePhotoFull(selected)} disabled={acting}
                          className="text-xs flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors"
                          style={{background:'#18181b',color:'#fff',fontSize:11}}>
                          <Trash2 className="w-3 h-3"/>Delete
                        </button>
                      </div>
                    )}

                    {/* Data grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="card p-5">
                        <h4 className="text-xs font-medium uppercase tracking-wide mb-4" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:10}}>Photo Data</h4>
                        {[
                          {l:'Aircraft', v:reg(selected), m:true},
                          {l:'Operator', v:operatorName(selected)},
                          {l:'Airport',  v:selected.airport ? `${selected.airport.iata} — ${selected.airport.name}` : '—'},
                          {l:'Shot Date',v:selected.shot_date || '—'},
                          {l:'Category', v:selected.category || '—'},
                        ].map((r,i,arr)=>(
                          <div key={r.l} className="flex items-center justify-between py-2.5" style={{borderBottom:i<arr.length-1?'1px solid #f5f5f7':'none'}}>
                            <span className="text-xs" style={{color:'#94a3b8'}}>{r.l}</span>
                            <span className="text-sm font-medium" style={{color:r.m?'#0ea5e9':'#0f172a',fontFamily:r.m?'"SF Mono",monospace':undefined}}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <div className="card p-5">
                          <h4 className="text-xs font-medium uppercase tracking-wide mb-4" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:10}}>File</h4>
                          {[
                            {l:'Resolution', v: selected.width_px && selected.height_px ? `${selected.width_px} × ${selected.height_px}` : '—'},
                            {l:'File Size',  v: selected.file_size_kb ? `${(selected.file_size_kb/1024).toFixed(1)} MB` : '—'},
                          ].map((r,i,arr)=>(
                            <div key={r.l} className="flex items-center justify-between py-2.5" style={{borderBottom:i<arr.length-1?'1px solid #f5f5f7':'none'}}>
                              <span className="text-xs" style={{color:'#94a3b8'}}>{r.l}</span>
                              <span className="text-sm font-medium" style={{color:'#0f172a'}}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="card p-5">
                          <h4 className="text-xs font-medium uppercase tracking-wide mb-4" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:10}}>Uploader</h4>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm" style={{background:'#0f172a',color:'#fff'}}>
                              {(spotterName(selected))[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium" style={{color:'#0f172a'}}>{spotterName(selected)}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="tag-accent text-xs">{selected.uploader?.rank || 'Observer'}</span>
                                <span className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>
                                  {selected.uploader?.approved_uploads || 0} photos
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
          )
        )}

        {/* USERS */}
        {adminTab==='users' && canManageUsers && (
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-headline text-2xl font-bold tracking-tight" style={{color:'#0f172a'}}>User Management</h2>
                <p className="text-xs mt-1" style={{color:'#94a3b8',maxWidth:520}}>
                  Ban blocks sign-in; <strong style={{color:'#64748b'}}>Remove account</strong> deletes the user from auth and the database (not R2 files). Only administrators — open the <strong style={{color:'#64748b'}}>Moderation</strong> tab → <strong style={{color:'#64748b'}}>User Management</strong>.
                </p>
              </div>
              <span className="text-sm shrink-0" style={{color:'#94a3b8'}}>{realUsers.length} users</span>
            </div>
            <div className="card overflow-hidden">
              <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-wide gap-2"
                style={{gridTemplateColumns:'minmax(0,1fr) 104px minmax(0,132px) 56px 72px minmax(148px,1fr)',background:'#f8fafc',borderBottom:'1px solid #f5f5f7',color:'#94a3b8',letterSpacing:'0.05em'}}>
                {['Spotter','Role','Rank','Photos','Joined','Actions'].map(h=><div key={h}>{h}</div>)}
              </div>
              {realUsers.map(u=>{
                const isBanned = u.is_banned === true;
                const rankManual = u.rank_manual === true;
                const rankSelectValue = rankManual ? (u.rank || 'Observer') : '__AUTO__';
                const draft = userDrafts[u.id] || {
                  role: u.role || 'SPOTTER',
                  rankSelectValue,
                  isBanned,
                  dirty: false,
                  saving: false,
                };
                return (
                <div key={u.id} className="grid items-center px-6 py-4 transition-colors gap-2"
                  style={{gridTemplateColumns:'minmax(0,1fr) 104px minmax(0,132px) 56px 72px minmax(148px,1fr)',borderBottom:'1px solid #f5f5f7',opacity:isBanned?0.5:1}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs" style={{background:isBanned?'#dc2626':'#0f172a',color:'#fff'}}>
                      {(u.display_name || u.username)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{color:'#0f172a'}}>{u.display_name || u.username}</span>
                        {isBanned && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{background:'#fef2f2',color:'#dc2626'}}>BANNED</span>}
                      </div>
                      <div className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>@{u.username}</div>
                    </div>
                  </div>
                  <div>
                    <select value={draft.role}
                      onChange={(e)=>updateUserDraft(u, { role: e.target.value })}
                      className="text-xs rounded-lg px-2 py-1 cursor-pointer"
                      style={{background:draft.role==='ADMIN'?'#f5f3ff':draft.role==='MODERATOR'?'#fffbeb':'#f0f9ff',
                        color:draft.role==='ADMIN'?'#7c3aed':draft.role==='MODERATOR'?'#d97706':'#0284c7',
                        border:'1px solid transparent',fontSize:11,fontWeight:500}}>
                      <option value="SPOTTER">Spotter</option>
                      <option value="SCREENER">Screener</option>
                      <option value="EXPERT">Expert</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <select value={draft.rankSelectValue}
                      onChange={(e)=>updateUserDraft(u, { rankSelectValue: e.target.value })}
                      className="text-xs rounded-lg px-1.5 py-1 cursor-pointer max-w-full"
                      style={{background:draft.rankSelectValue!=='__AUTO__'?'#fffbeb':'#f8fafc',color:draft.rankSelectValue!=='__AUTO__'?'#b45309':'#64748b',border:'1px solid #e2e8f0',fontSize:10,fontWeight:500}}>
                      {ADMIN_RANK_OPTIONS.map(o=>(
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-sm font-medium" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{u.approved_uploads || 0}</div>
                  <div className="text-xs" style={{color:'#94a3b8'}}>
                    {u.joined_at ? new Date(u.joined_at).toLocaleDateString('en-US', {month:'short', year:'numeric'}) : '—'}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={()=>updateUserDraft(u, { isBanned: !draft.isBanned })}
                      className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors"
                      style={{background:draft.isBanned?'#f0fdf4':'#fef2f2',color:draft.isBanned?'#16a34a':'#dc2626',border:'none',cursor:'pointer',fontSize:10,fontWeight:500}}>
                      <Ban className="w-3 h-3"/>
                      {draft.isBanned?'Unban':'Ban'}
                    </button>
                    <button
                      onClick={()=>saveUserDraft(u)}
                      disabled={!draft.dirty || draft.saving}
                      className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors"
                      style={{background:draft.dirty?'#0f172a':'#f1f5f9',color:draft.dirty?'#fff':'#94a3b8',border:'none',cursor:draft.dirty?'pointer':'not-allowed',fontSize:10,fontWeight:500}}>
                      {draft.saving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3 h-3"/>}
                      Save
                    </button>
                    <button
                      type="button"
                      title="Permanently delete account (admin only)"
                      onClick={() => deleteUserAccount({ id: u.id, username: u.username })}
                      disabled={u.id === adminSelfId || u.role === 'ADMIN' || deletingUserId === u.id}
                      className="text-xs flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors"
                      style={{
                        background:'#fef2f2',
                        color:'#b91c1c',
                        border:'1px solid rgba(220,38,38,0.25)',
                        cursor: u.id === adminSelfId || u.role === 'ADMIN' || deletingUserId === u.id ? 'not-allowed' : 'pointer',
                        fontSize:10,
                        fontWeight:500,
                        opacity: u.id === adminSelfId || u.role === 'ADMIN' ? 0.45 : 1,
                      }}>
                      {deletingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin"/> : <UserX className="w-3 h-3"/>}
                      Remove
                    </button>
                  </div>
                </div>
              );})}
            </div>
          </motion.div>
        )}

        {/* STATS */}
        {adminTab==='stats'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-headline text-xl font-semibold mb-5 tracking-tight" style={{color:'#0f172a'}}>Photo Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:'Total Photos', v:photos.length, c:'#0ea5e9'},
                  {l:'Pending',      v:pendingCount,   c:'#ff9500'},
                  {l:'Approved',     v:approvedCount,  c:'#34c759'},
                  {l:'Rejected',     v:rejectedCount,  c:'#ff3b30'},
                ].map(item=>(
                  <div key={item.l} className="card-gray p-4 rounded-2xl">
                    <div className="text-xs mb-1" style={{color:'#94a3b8'}}>{item.l}</div>
                    <div className="text-2xl font-bold tracking-tight" style={{color:item.c,fontFamily:'"SF Mono",monospace'}}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="font-headline text-xl font-semibold mb-5 tracking-tight" style={{color:'#0f172a'}}>User Stats</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {l:'Total Users',  v:realUsers.length, c:'#0ea5e9'},
                  {l:'Admins',       v:realUsers.filter(u=>u.role==='ADMIN').length, c:'#7c3aed'},
                  {l:'Moderators',   v:realUsers.filter(u=>u.role==='MODERATOR').length, c:'#d97706'},
                  {l:'Spotters',     v:realUsers.filter(u=>u.role==='SPOTTER').length, c:'#475569'},
                ].map(item=>(
                  <div key={item.l} className="card-gray p-4 rounded-2xl">
                    <div className="text-xs mb-1" style={{color:'#94a3b8'}}>{item.l}</div>
                    <div className="text-2xl font-bold tracking-tight" style={{color:item.c,fontFamily:'"SF Mono",monospace'}}>{item.v}</div>
                  </div>
                ))}
              </div>
            </div>
            </div>

            <div className="card p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 rounded-xl shrink-0" style={{background:'#f0f9ff'}}>
                  <Cloud className="w-5 h-5" style={{color:'#0284c7'}} />
                </div>
                <div>
                  <h3 className="font-headline text-xl font-semibold tracking-tight" style={{color:'#0f172a'}}>Cloudflare R2 storage</h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{color:'#64748b'}}>
                    Account-wide usage from the Cloudflare API (all R2 buckets). Plan size defaults to <strong>10 GB</strong> for the bar;
                    set <span className="font-mono">R2_STORAGE_CAP_GB</span> on Vercel to <strong>20</strong> (or your limit) to match your account.
                  </p>
                </div>
              </div>

              {r2MetricsLoading && (
                <div className="flex items-center gap-2 py-6" style={{color:'#94a3b8'}}>
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                  <span className="text-sm">Loading R2 metrics…</span>
                </div>
              )}

              {!r2MetricsLoading && r2MetricsError && (
                <div className="rounded-xl p-4 text-sm" style={{background:'#fefce8', border:'1px solid #fde047', color:'#854d0e'}}>
                  {r2MetricsError}
                  {r2MetricsErrorCode === 'not_configured' && (
                    <p className="text-xs mt-2 opacity-90">
                      Add <span className="font-mono">CLOUDFLARE_API_TOKEN</span> (R2 read) and reuse <span className="font-mono">R2_ACCOUNT_ID</span> on Vercel, then redeploy.
                    </p>
                  )}
                </div>
              )}

              {!r2MetricsLoading && !r2MetricsError && r2Metrics && (
                <>
                  <div className="card-gray p-4 rounded-2xl mb-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{color:'#94a3b8'}}>
                          Plan capacity (your target)
                        </div>
                        <div className="text-2xl font-bold tracking-tight" style={{color:'#0f172a', fontFamily:'"SF Mono",monospace'}}>
                          {r2Metrics.capGb % 1 === 0 ? String(Math.round(r2Metrics.capGb)) : r2Metrics.capGb.toFixed(1)} GB
                          <span className="text-sm font-normal ml-2" style={{color:'#94a3b8'}}>
                            ({formatStorageBytes(r2Metrics.capBytes)} total)
                          </span>
                        </div>
                      </div>
                      {r2Metrics.capSource === 'default' ? (
                        <span className="text-[10px] px-2 py-1 rounded-lg shrink-0 max-w-[14rem] leading-snug" style={{background:'#f1f5f9', color:'#64748b'}}>
                          Default 10 GB — add <span className="font-mono">R2_STORAGE_CAP_GB=20</span> on Vercel if your plan is 20 GB.
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-1 rounded-lg shrink-0" style={{background:'#ecfdf5', color:'#047857'}}>
                          From <span className="font-mono">R2_STORAGE_CAP_GB</span>
                        </span>
                      )}
                    </div>
                    {(() => {
                      const pct = r2Metrics.capBytes > 0
                        ? Math.min(100, (r2Metrics.totalStoredBytes / r2Metrics.capBytes) * 100)
                        : 0;
                      const over = r2Metrics.totalStoredBytes > r2Metrics.capBytes;
                      const low = r2Metrics.remainingBytes < 1024 ** 3 * 0.5;
                      return (
                        <>
                          <div className="h-3 rounded-full overflow-hidden mb-2" style={{ background: '#e2e8f0' }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${pct}%`,
                                background: over ? '#dc2626' : '#0ea5e9',
                              }}
                            />
                          </div>
                          <div className="flex flex-wrap justify-between gap-2 text-xs">
                            <span style={{ color: '#64748b' }}>
                              Used{' '}
                              <span className="font-mono font-semibold" style={{ color: '#0f172a' }}>
                                {formatStorageBytes(r2Metrics.totalStoredBytes)}
                              </span>
                              <span className="font-mono" style={{ color: '#94a3b8' }}> · {pct.toFixed(1)}%</span>
                            </span>
                            <span style={{ color: '#64748b' }}>
                              Remaining{' '}
                              <span
                                className="font-mono font-semibold"
                                style={{ color: low || over ? '#dc2626' : '#16a34a' }}
                              >
                                {formatStorageBytes(r2Metrics.remainingBytes)}
                              </span>
                            </span>
                          </div>
                          {over && (
                            <p className="text-[11px] mt-2 font-medium" style={{ color: '#b91c1c' }}>
                              Reported usage exceeds this plan size — raise <span className="font-mono">R2_STORAGE_CAP_GB</span> or check Cloudflare billing.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="card-gray p-4 rounded-2xl">
                      <div className="text-xs mb-1" style={{color:'#94a3b8'}}>Total stored</div>
                      <div className="text-xl font-bold tracking-tight" style={{color:'#0ea5e9', fontFamily:'"SF Mono",monospace'}}>
                        {formatStorageBytes(r2Metrics.totalStoredBytes)}
                      </div>
                    </div>
                    <div className="card-gray p-4 rounded-2xl">
                      <div className="text-xs mb-1" style={{color:'#94a3b8'}}>Object data</div>
                      <div className="text-xl font-bold tracking-tight" style={{color:'#0f172a', fontFamily:'"SF Mono",monospace'}}>
                        {formatStorageBytes(r2Metrics.payloadBytes)}
                      </div>
                    </div>
                    <div className="card-gray p-4 rounded-2xl">
                      <div className="text-xs mb-1" style={{color:'#94a3b8'}}>Metadata</div>
                      <div className="text-xl font-bold tracking-tight" style={{color:'#475569', fontFamily:'"SF Mono",monospace'}}>
                        {formatStorageBytes(r2Metrics.metadataBytes)}
                      </div>
                    </div>
                    <div className="card-gray p-4 rounded-2xl">
                      <div className="text-xs mb-1" style={{color:'#94a3b8'}}>Objects</div>
                      <div className="text-xl font-bold tracking-tight" style={{color:'#0f172a', fontFamily:'"SF Mono",monospace'}}>
                        {r2Metrics.objectCount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {r2Metrics.note && (
                    <p className="text-[11px] mt-4 leading-relaxed" style={{color:'#94a3b8'}}>{r2Metrics.note}</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
