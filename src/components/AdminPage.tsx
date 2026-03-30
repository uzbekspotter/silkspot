import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Eye, Camera, Clock, User, Flag, Star, BarChart3, Shield, ChevronRight, X, Maximize2, Search, Download, Check, Users, LogOut, Sliders, Loader2 } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';

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

export const AdminPage = () => {
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

  useEffect(() => { loadPhotos(); loadUsers(); }, [loadPhotos, loadUsers]);

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

  const reg = (p: QueuePhoto) => p.aircraft?.registration || '?';
  const spotterName = (p: QueuePhoto) => p.uploader?.display_name || p.uploader?.username || '?';
  const airportCode = (p: QueuePhoto) => p.airport?.iata || '—';
  const operatorName = (p: QueuePhoto) => p.operator?.name || '—';

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{background:'#fff',minHeight:'100vh'}}>

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
            <img src={selected.storage_path} className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain" referrerPolicy="no-referrer"/>
            <button onClick={()=>setLightbox(false)} className="absolute top-5 right-5 p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)',color:'#fff'}}>
              <X className="w-5 h-5"/>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <section style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div className="max-w-screen-xl mx-auto px-8 py-10">
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
            {ATABS.map(t=>(
              <button key={t.id} onClick={()=>setAdminTab(t.id)}
                className="text-sm px-5 py-3 transition-all"
                style={{color:adminTab===t.id?'#0f172a':'#475569',borderBottom:adminTab===t.id?'2px solid #0f172a':'2px solid transparent',fontWeight:adminTab===t.id?500:400,background:'transparent'}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-8 py-8">

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
                        {photo.storage_path?.startsWith('http') && (
                          <img src={photo.storage_path} alt={reg(photo)} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
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

                    {/* Photo preview */}
                    <div className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={()=>setLightbox(true)}>
                      {selected.storage_path?.startsWith('http') ? (
                        <img src={selected.storage_path} alt={reg(selected)} className="w-full object-cover" style={{maxHeight:360}} referrerPolicy="no-referrer"/>
                      ) : (
                        <div className="w-full flex items-center justify-center" style={{height:200,background:'#f1f5f9'}}>
                          <div className="text-center" style={{color:'#94a3b8'}}>
                            <Camera className="w-8 h-8 mx-auto mb-2"/>
                            <p className="text-xs">Image not available (demo upload)</p>
                          </div>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-5" style={{background:'linear-gradient(transparent, rgba(0,0,0,0.7))'}}>
                        <h2 className="font-headline text-3xl font-bold tracking-tight mb-1" style={{color:'#fff'}}>{reg(selected)}</h2>
                        <div className="text-sm" style={{color:'rgba(255,255,255,0.7)'}}>{operatorName(selected)} · {airportCode(selected)}</div>
                      </div>
                    </div>

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
        {adminTab==='users'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-bold tracking-tight" style={{color:'#0f172a'}}>User Management</h2>
              <span className="text-sm" style={{color:'#94a3b8'}}>{realUsers.length} users</span>
            </div>
            <div className="card overflow-hidden">
              <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-wide"
                style={{gridTemplateColumns:'1fr 80px 90px 80px',background:'#f8fafc',borderBottom:'1px solid #f5f5f7',color:'#94a3b8',letterSpacing:'0.05em'}}>
                {['Spotter','Rank','Photos','Joined'].map(h=><div key={h}>{h}</div>)}
              </div>
              {realUsers.map(u=>(
                <div key={u.id} className="grid items-center px-6 py-4 transition-colors"
                  style={{gridTemplateColumns:'1fr 80px 90px 80px',borderBottom:'1px solid #f5f5f7'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs" style={{background:'#0f172a',color:'#fff'}}>
                      {(u.display_name || u.username)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{color:'#0f172a'}}>{u.display_name || u.username}</div>
                      <div className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>@{u.username}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{background:'#f0f9ff',color:'#0284c7'}}>{u.rank || 'Observer'}</span>
                  </div>
                  <div className="text-sm font-medium" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{u.approved_uploads || 0}</div>
                  <div className="text-xs" style={{color:'#94a3b8'}}>
                    {u.joined_at ? new Date(u.joined_at).toLocaleDateString('en-US', {month:'short', year:'numeric'}) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STATS */}
        {adminTab==='stats'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
