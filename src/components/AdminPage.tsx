import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Eye, Camera, Clock, User, Flag, Star, BarChart3, Shield, ChevronRight, X, Maximize2, Search, Download, Check, Users, LogOut, Sliders } from 'lucide-react';
import { useState, useMemo } from 'react';
import React from 'react';
import { PhotoReviewTools } from './PhotoReviewTools';

type PhotoStatus = 'PENDING'|'APPROVED'|'REJECTED';
type QueueTab    = 'pending'|'approved'|'rejected'|'flagged';
type AdminTab    = 'moderation'|'users'|'stats';

interface PendingPhoto {
  id:string; url:string; reg:string; type:string; operator:string; airport:string;
  shotDate:string; category:string; spotter:string; spotterRank:string;
  spotterUploads:number; spotterApprovalRate:number; submittedAt:string;
  metadataScore:number; status:PhotoStatus; flagged?:boolean; notes?:string;
  width:number; height:number; sizeMb:number; msn?:string; livery?:string;
}

const QUEUE: PendingPhoto[] = [
  {id:'q1',url:'https://lh3.googleusercontent.com/aida-public/AB6AXuChaRQt78JTu8hCOij5PKMGgoKuPk7eMta-saYWZmrDin28T68vxzXtw5cm0Oh6MPt_Y14FETc_7Ztdgdm5sScIR1FTjBvsJT1p-xgkxM02eKl15LgkSmmUR03DZNpjzDptaqzJ7R8ip4Zy3L7rYAggRB8aJ9LnVXztJ9t0ejEhOvzV5k1JInTxQxPejLdR8QybtCGGNOjvIM52g14O7vXzXSAUIBCD80GYLN5fyagM-WUDXU36zVASixyxVT10pzx1uDQRqyHVg0E',
    reg:'G-VROM',type:'Boeing 747-443',operator:'Virgin Atlantic',airport:'LHR',shotDate:'2025-03-15',category:'Landing',spotter:'Marcus Webb',spotterRank:'Legend',spotterUploads:5284,spotterApprovalRate:97,submittedAt:'2m ago',metadataScore:94,status:'PENDING',width:6000,height:4000,sizeMb:14.2,msn:'32340',livery:'Classic Scarlet'},
  {id:'q2',url:'https://lh3.googleusercontent.com/aida-public/AB6AXuDbJLu5tKdeJWdrlWCLzYEdZfLGuZ8E3lYMmO_sEaeTx5bI_4C9Sxg23KwNaS6Zw5nIJqUmKO5nW9LpKZMfbDz3co_YfJzVSya_iOyWwdl3J8IGDdrGVBIz6XXZd4GHfSAMEdqJqFf5DEEJwCncyqK-BYVsEYNze4haPz_a1cRGF2mmFU-Sx2gH7OpXyUcJfU9X4qI545bQ9-zQhGDVuVJtxk4yCUgg8e9ufs_cfkkNxsB7QkUGFCqX8dgw6yJ4mIxf32XOsRUeOBs',
    reg:'F-WXWB',type:'Airbus A350-941',operator:'Airbus Industries',airport:'TLS',shotDate:'2025-03-14',category:'Takeoff',spotter:'Jean Dupont',spotterRank:'Expert',spotterUploads:1203,spotterApprovalRate:91,submittedAt:'18m ago',metadataScore:88,status:'PENDING',width:5472,height:3648,sizeMb:9.8,msn:'001',livery:'House Colors'},
  {id:'q3',url:'https://lh3.googleusercontent.com/aida-public/AB6AXuDXgcwMJokDzWdWwY-KjiaYTzvDu4aG6IIV6ehwc3UVrM4yKEgr4tmEnTckCMdJm0eQfn8ug1JKP2QD9Jc40itddeeDaks_V-M1g6CvDfxLKGiDdk8hsyv-DbjokB0FUS3eNoXxhk5atHStEQWR-q3Z6rTSsT9cg-8X9nKnAjavel6v2k4CL8LDnStoflTLQDPUvcysk6AORPx_tLEaL3toVPzupEDDArDvM4RMkyTk95jCvs2F09qsHZwDP9HXrNh1BXcWBjcFpd0',
    reg:'A6-EVN',type:'Airbus A380-861',operator:'Emirates',airport:'DXB',shotDate:'2025-03-13',category:'Static',spotter:'Aziz Karimov',spotterRank:'Expert',spotterUploads:1847,spotterApprovalRate:94,submittedAt:'1h ago',metadataScore:71,status:'PENDING',flagged:true,width:4000,height:2667,sizeMb:7.1,notes:'Low metadata — MSN and livery missing'},
  {id:'q4',url:'https://lh3.googleusercontent.com/aida-public/AB6AXuBqtYSj6Qw2m06IB4hMWBbc7NAdY58ImQlsIcARRDGXoZjNW7h5F_vXP4k4S88bltOLsB21d8AkCp8xPybz7eIraPk2Mtcj8xEgEQYtERjiVpK7J2L5P-m7W7S4QTuPgKe4UQD9OpqgMKretwHnbVOcuCcGlT9yrBAE8hXVPKobvrj_DHM2d0aIcUp0gx6JEOMwcSmqMmfDhykic_DIXN9bZfzQp2DAO533yIFfdAxD3x71YB46ykO-gQ7iDqlaSIcKAG-fp8HSYdI',
    reg:'N829AN',type:'Boeing 787-9',operator:'American Airlines',airport:'JFK',shotDate:'2025-03-12',category:'Takeoff',spotter:'Tom Wilson',spotterRank:'Contributor',spotterUploads:47,spotterApprovalRate:78,submittedAt:'3h ago',metadataScore:62,status:'PENDING',width:3000,height:2000,sizeMb:4.2},
];

const REJECTION_REASONS = ['Low image quality / out of focus','Aircraft not clearly visible','Heavy watermark or signature','Incorrect metadata / wrong registration','Duplicate submission','Does not meet resolution requirements','Copyright violation','Custom reason…'];

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

export const AdminPage = () => {
  const [adminTab,  setAdminTab]  = useState<AdminTab>('moderation');
  const [queueTab,  setQueueTab]  = useState<QueueTab>('pending');
  const [selected,  setSelected]  = useState<PendingPhoto|null>(QUEUE[0]);
  const [decisions, setDecisions] = useState<Record<string,PhotoStatus>>({});
  const [rejectReason,     setRejectReason]     = useState('');
  const [customReason,     setCustomReason]     = useState('');
  const [showRejectModal,  setShowRejectModal]  = useState(false);
  const [lightbox,         setLightbox]         = useState(false);
  const [search,           setSearch]           = useState('');
  const [bulkSel,          setBulkSel]          = useState<Set<string>>(new Set());
  const [showReviewTools,  setShowReviewTools]  = useState(false);

  const eff = (p:PendingPhoto):PhotoStatus => decisions[p.id]??p.status;

  const queueFiltered = useMemo(()=>{
    let list = QUEUE.filter(p=>{
      const s=eff(p);
      if(queueTab==='pending')  return s==='PENDING'&&!p.flagged;
      if(queueTab==='approved') return s==='APPROVED';
      if(queueTab==='rejected') return s==='REJECTED';
      if(queueTab==='flagged')  return !!p.flagged&&s==='PENDING';
      return true;
    });
    if(search) list=list.filter(p=>p.reg.toLowerCase().includes(search.toLowerCase())||p.spotter.toLowerCase().includes(search.toLowerCase()));
    return list;
  },[decisions,queueTab,search]);

  const pendingCount  = QUEUE.filter(p=>eff(p)==='PENDING'&&!p.flagged).length;
  const flaggedCount  = QUEUE.filter(p=>p.flagged&&eff(p)==='PENDING').length;
  const approvedCount = QUEUE.filter(p=>eff(p)==='APPROVED').length;
  const rejectedCount = QUEUE.filter(p=>eff(p)==='REJECTED').length;

  const approve=(p:PendingPhoto)=>{
    setDecisions(d=>({...d,[p.id]:'APPROVED'}));
    const next=queueFiltered.find(q=>q.id!==p.id&&eff(q)==='PENDING');
    setSelected(next??null);
  };
  const confirmReject=()=>{
    if(!selected) return;
    setDecisions(d=>({...d,[selected.id]:'REJECTED'}));
    setShowRejectModal(false);
    const next=queueFiltered.find(q=>q.id!==selected.id&&eff(q)==='PENDING');
    setSelected(next??null);
  };

  const QTABS = [{id:'pending' as QueueTab,label:'Pending',count:pendingCount,color:'#ff9500'},{id:'flagged' as QueueTab,label:'Flagged',count:flaggedCount,color:'#ff3b30'},{id:'approved' as QueueTab,label:'Approved',count:approvedCount,color:'#34c759'},{id:'rejected' as QueueTab,label:'Rejected',count:rejectedCount,color:'#94a3b8'}];
  const ATABS = [{id:'moderation' as AdminTab,label:'Moderation Queue'},{id:'users' as AdminTab,label:'User Management'},{id:'stats' as AdminTab,label:'Platform Stats'}];

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
              <h3 className="font-headline text-xl font-semibold mb-1 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Reject Photo</h3>
              <p className="text-sm mb-5" style={{color:'#475569'}}>{selected.reg} · {selected.spotter}</p>
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
                  disabled={!rejectReason||(rejectReason==='Custom reason…'&&!customReason)}
                  className="flex-1 rounded-full font-medium text-sm transition-all justify-center flex items-center"
                  style={{height:44,background:rejectReason?'#dc2626':'#f8fafc',color:rejectReason?'#fff':'#94a3b8',cursor:rejectReason?'pointer':'not-allowed'}}>
                  Reject Photo
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
            style={{background:'rgba(0,0,0,0.94)',backdropFilter:'blur(20px)'}}
            onClick={()=>setLightbox(false)}>
            <img src={selected.url} className="max-w-[90vw] max-h-[90vh] rounded-2xl object-contain" referrerPolicy="no-referrer"/>
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
              {[{label:'Pending',val:pendingCount+flaggedCount,color:'#ff9500'},{label:'Approved today',val:187,color:'#34c759'},{label:'Rejected today',val:14,color:'#ff3b30'},{label:'Avg time',val:'4.2 min',color:'#0ea5e9'}].map((s,i,arr)=>(
                <div key={s.label} className="px-6 py-3 text-center" style={{borderRight:i<arr.length-1?'1px solid #e2e8f0':'none'}}>
                  <div className="text-xl font-semibold tracking-tight" style={{color:s.color,fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{s.val}</div>
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
                  const status=eff(photo), isSelected=selected?.id===photo.id;
                  const sc=status==='APPROVED'?'#34c759':status==='REJECTED'?'#ff3b30':'#ff9500';
                  return(
                    <motion.div key={photo.id} initial={{opacity:0,x:-6}} animate={{opacity:1,x:0}} transition={{delay:i*0.03}}
                      className="card flex items-center gap-3 p-3 cursor-pointer"
                      style={{border:isSelected?'1px solid rgba(14,165,233,0.3)':'1px solid #e8e8ed',background:isSelected?'rgba(14,165,233,0.03)':'#fff',borderLeft:`3px solid ${sc}`}}
                      onClick={()=>setSelected(photo)}>
                      <div className="w-14 h-10 rounded-xl overflow-hidden shrink-0">
                        <img src={photo.url} alt={photo.reg} className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{photo.reg}</span>
                          {photo.flagged&&<Flag className="w-3 h-3" style={{color:'#ff3b30'}}/>}
                        </div>
                        <div className="text-xs truncate" style={{color:'#94a3b8'}}>{photo.spotter} · {photo.airport}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          {[...Array(5)].map((_,j)=><div key={j} className="h-1 w-3 rounded-full" style={{background:j<Math.round(photo.metadataScore/20)?'#0f172a':'#f8fafc'}}/>)}
                          <span className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{photo.metadataScore}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{photo.submittedAt}</span>
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

                    {/* Photo */}
                    <div className="relative rounded-2xl overflow-hidden cursor-pointer group" onClick={()=>setLightbox(true)}>
                      <img src={selected.url} alt={selected.reg} className="w-full object-cover" style={{maxHeight:360}} referrerPolicy="no-referrer"/>
                      <div className="photo-overlay absolute inset-0"/>
                      <div className="absolute top-4 left-4 flex items-center gap-2">
                        {selected.flagged&&<span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{background:'rgba(255,59,48,0.2)',color:'#ff3b30',backdropFilter:'blur(8px)'}}>⚠ Flagged</span>}
                        <span className="tag" style={{background:'rgba(255,255,255,0.9)',border:'none'}}>{selected.category}</span>
                      </div>
                      <div className="absolute top-4 right-4 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" style={{background:'rgba(0,0,0,0.4)'}}>
                        <Maximize2 className="w-4 h-4 text-white"/>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h2 className="font-headline text-4xl font-bold tracking-tight mb-1" style={{color:'#fff',letterSpacing:'-0.02em'}}>{selected.reg}</h2>
                        <div className="text-sm" style={{color:'rgba(255,255,255,0.7)'}}>{selected.type} · {selected.operator}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    {eff(selected)==='PENDING'?(
                      <div className="flex items-center gap-3">
                        <button onClick={()=>approve(selected)}
                          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium text-sm transition-all"
                          style={{background:'#f0fdf4',color:'#16a34a',border:'1px solid rgba(52,199,89,0.25)'}}>
                          <CheckCircle2 className="w-5 h-5"/>Approve
                        </button>
                        <button onClick={()=>setShowRejectModal(true)}
                          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-medium text-sm transition-all"
                          style={{background:'#fef2f2',color:'#dc2626',border:'1px solid rgba(220,38,38,0.2)'}}>
                          <XCircle className="w-5 h-5"/>Reject
                        </button>
                        <button className="p-4 rounded-2xl transition-all" style={{background:'#fffbeb',color:'#d97706',border:'1px solid rgba(217,119,6,0.2)'}}><Flag className="w-5 h-5"/></button>
                        <button className="p-4 rounded-2xl transition-all" style={{background:'#f8fafc',color:'#475569',border:'1px solid #e8e8ed'}}><Star className="w-5 h-5"/></button>
                        <button onClick={()=>setShowReviewTools(v=>!v)}
                          className="flex items-center gap-2 px-4 py-3 rounded-2xl font-medium text-sm transition-all"
                          style={{background:showReviewTools?'#0f172a':'#f8fafc',color:showReviewTools?'#fff':'#475569',border:'1px solid #e8e8ed'}}>
                          <Sliders className="w-4 h-4"/>
                          Review Tools
                        </button>
                      </div>
                    ):(
                      <div className="flex items-center gap-3 p-4 rounded-2xl"
                        style={{background:eff(selected)==='APPROVED'?'#f0fdf4':'#fef2f2',border:`1px solid ${eff(selected)==='APPROVED'?'rgba(52,199,89,0.25)':'rgba(220,38,38,0.2)'}`}}>
                        {eff(selected)==='APPROVED'?<CheckCircle2 className="w-5 h-5" style={{color:'#16a34a'}}/>:<XCircle className="w-5 h-5" style={{color:'#dc2626'}}/>}
                        <span className="font-medium text-sm" style={{color:eff(selected)==='APPROVED'?'#16a34a':'#dc2626'}}>
                          {eff(selected)==='APPROVED'?'Approved':'Rejected'}
                        </span>
                        <button onClick={()=>setDecisions(d=>{const n={...d};delete n[selected.id];return n;})}
                          className="ml-auto text-xs btn-secondary" style={{padding:'4px 12px',height:'auto'}}>Undo</button>
                      </div>
                    )}

                    {selected.notes&&(
                      <div className="flex items-start gap-3 px-4 py-3 rounded-2xl text-sm" style={{background:'#fffbeb',border:'1px solid rgba(217,119,6,0.2)',color:'#d97706'}}>
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0"/>{selected.notes}
                      </div>
                    )}

                    {/* Data grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="card p-5">
                        <h4 className="text-xs font-medium uppercase tracking-wide mb-4" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:10}}>Photo Data</h4>
                        {[{l:'Aircraft',v:selected.reg,m:true},{l:'Type',v:selected.type},{l:'Operator',v:selected.operator},{l:'Airport',v:selected.airport},{l:'Shot Date',v:selected.shotDate},{l:'Category',v:selected.category},...(selected.msn?[{l:'MSN',v:selected.msn,m:true}]:[]),...(selected.livery?[{l:'Livery',v:selected.livery}]:[])].map((r,i,arr)=>(
                          <div key={r.l} className="flex items-center justify-between py-2.5" style={{borderBottom:i<arr.length-1?'1px solid #f5f5f7':'none'}}>
                            <span className="text-xs" style={{color:'#94a3b8'}}>{r.l}</span>
                            <span className="text-sm font-medium" style={{color:(r as any).m?'#0ea5e9':'#0f172a',fontFamily:(r as any).m?'"SF Mono",monospace':undefined}}>{r.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-4">
                        <div className="card p-5">
                          <h4 className="text-xs font-medium uppercase tracking-wide mb-4" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:10}}>File</h4>
                          {[{l:'Resolution',v:`${selected.width} × ${selected.height}`},{l:'File Size',v:`${selected.sizeMb} MB`},{l:'Aspect',v:`${(selected.width/selected.height).toFixed(2)}:1`}].map((r,i,arr)=>(
                            <div key={r.l} className="flex items-center justify-between py-2.5" style={{borderBottom:i<arr.length-1?'1px solid #f5f5f7':'none'}}>
                              <span className="text-xs" style={{color:'#94a3b8'}}>{r.l}</span>
                              <span className="text-sm font-medium" style={{color:'#0f172a'}}>{r.v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="card p-5">
                          <h4 className="text-xs font-medium uppercase tracking-wide mb-4" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:10}}>Spotter Trust</h4>
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm" style={{background:'#0f172a',color:'#fff'}}>{selected.spotter[0]}</div>
                            <div>
                              <div className="text-sm font-medium" style={{color:'#0f172a'}}>{selected.spotter}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="tag-accent text-xs">{selected.spotterRank}</span>
                                <span className="text-xs" style={{color:selected.spotterApprovalRate>=90?'#34c759':'#ff9500',fontFamily:'"SF Mono",monospace'}}>{selected.spotterApprovalRate}% ok</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span style={{color:'#94a3b8'}}>Total uploads</span>
                            <span style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{selected.spotterUploads.toLocaleString('en-US')}</span>
                          </div>
                        </div>
                        <div className="card p-5 flex items-center gap-4">
                          <ScoreRing score={selected.metadataScore}/>
                          <div>
                            <div className="text-xs mb-0.5" style={{color:'#94a3b8'}}>Metadata Quality</div>
                            <div className="font-semibold text-base tracking-tight" style={{color:selected.metadataScore>=80?'#34c759':selected.metadataScore>=60?'#ff9500':'#ff3b30',letterSpacing:'-0.01em'}}>
                              {selected.metadataScore>=80?'Excellent':selected.metadataScore>=60?'Acceptable':'Incomplete'}
                            </div>
                            <div className="text-xs mt-0.5" style={{color:'#94a3b8'}}>{selected.metadataScore<60?'Request corrections':selected.metadataScore<80?'Missing optional fields':'All key fields present'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Review Tools Panel ── */}
                    <AnimatePresence>
                      {showReviewTools && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.25 }}>
                          <PhotoReviewTools
                            photoUrl={selected.url}
                            reg={selected.reg}
                            width={selected.width}
                            height={selected.height}
                            sizeMb={selected.sizeMb}
                            metadataScore={selected.metadataScore}
                            category={selected.category}
                            shotDate={selected.shotDate}
                            spotter={selected.spotter}
                            onClose={() => setShowReviewTools(false)}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        )}

        {/* USERS */}
        {adminTab==='users'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>User Management</h2>
              <button className="btn-outline" style={{height:36,padding:'0 16px',fontSize:13,gap:6}}><Download className="w-3.5 h-3.5"/>Export CSV</button>
            </div>
            <div className="card overflow-hidden">
              <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-wide"
                style={{gridTemplateColumns:'1fr 80px 90px 90px 80px 80px 60px',background:'#f8fafc',borderBottom:'1px solid #f5f5f7',color:'#94a3b8',letterSpacing:'0.05em'}}>
                {['Spotter','Rank','Uploads','Approved','Rate','Joined',''].map(h=><div key={h}>{h}</div>)}
              </div>
              {[{name:'Marcus Webb',un:'marcuswebb',rank:'Legend',uploads:5284,approved:5128,rate:97,joined:'Mar 2018',country:'🇬🇧'},{name:'Yuki Tanaka',un:'yukitanaka',rank:'Master',uploads:3190,approved:3032,rate:95,joined:'Jan 2019',country:'🇯🇵'},{name:'Aziz Karimov',un:'azizspots',rank:'Expert',uploads:1847,approved:1735,rate:94,joined:'Mar 2019',country:'🇺🇿'},{name:'Tom Wilson',un:'twilson47',rank:'Contributor',uploads:47,approved:37,rate:79,joined:'Jan 2025',country:'🇺🇸'}].map((u,i)=>(
                <div key={u.un} className="grid items-center px-6 py-4 transition-colors cursor-pointer"
                  style={{gridTemplateColumns:'1fr 80px 90px 90px 80px 80px 60px',borderBottom:'1px solid #f5f5f7'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs" style={{background:'#0f172a',color:'#fff'}}>{u.name[0]}</div>
                    <div>
                      <div className="text-sm font-medium" style={{color:'#0f172a'}}>{u.name} {u.country}</div>
                      <div className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>@{u.un}</div>
                    </div>
                  </div>
                  <div><span className="tag-accent">{u.rank}</span></div>
                  <div className="text-sm font-medium" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{u.uploads.toLocaleString('en-US')}</div>
                  <div className="text-sm" style={{color:'#475569',fontFamily:'"SF Mono",monospace'}}>{u.approved.toLocaleString('en-US')}</div>
                  <div className="text-sm font-medium" style={{color:u.rate>=90?'#34c759':'#ff9500',fontFamily:'"SF Mono",monospace'}}>{u.rate}%</div>
                  <div className="text-xs" style={{color:'#94a3b8'}}>{u.joined}</div>
                  <div className="flex items-center gap-1.5">
                    <button className="p-1.5 rounded-lg transition-colors" style={{color:'#94a3b8'}} onMouseEnter={e=>e.currentTarget.style.color='#0f172a'} onMouseLeave={e=>e.currentTarget.style.color='#94a3b8'}><Eye className="w-3.5 h-3.5"/></button>
                    <button className="p-1.5 rounded-lg transition-colors" style={{color:'#94a3b8'}} onMouseEnter={e=>e.currentTarget.style.color='#ff3b30'} onMouseLeave={e=>e.currentTarget.style.color='#94a3b8'}><Flag className="w-3.5 h-3.5"/></button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* STATS */}
        {adminTab==='stats'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {[{title:'Decisions Today',items:[{l:'Approved',v:187,c:'#34c759'},{l:'Rejected',v:14,c:'#ff3b30'},{l:'Flagged',v:7,c:'#ff9500'},{l:'Pending',v:23,c:'#0ea5e9'}]},{title:'Queue Health',items:[{l:'Avg Review Time',v:'4.2 min',c:'#0ea5e9'},{l:'Approval Rate',v:'93%',c:'#34c759'},{l:'Active Mods',v:'5',c:'#475569'},{l:'Oldest Pending',v:'8h ago',c:'#ff9500'}]}].map(section=>(
              <div key={section.title} className="card p-6">
                <h3 className="font-headline text-xl font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>{section.title}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.items.map(item=>(
                    <div key={item.l} className="card-gray p-4 rounded-2xl">
                      <div className="text-xs mb-1" style={{color:'#94a3b8'}}>{item.l}</div>
                      <div className="text-2xl font-bold tracking-tight" style={{color:item.c,fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="xl:col-span-2 card p-6">
              <h3 className="font-headline text-xl font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Recent Actions</h3>
              {[{action:'approved',photo:'G-VXXB',mod:'Admin',time:'2m ago',color:'#34c759'},{action:'rejected',photo:'D-ABCD',mod:'Mod_1',time:'5m ago',color:'#ff3b30'},{action:'approved',photo:'A6-ENB',mod:'Admin',time:'12m ago',color:'#34c759'},{action:'flagged',photo:'N-XXXX',mod:'Mod_1',time:'31m ago',color:'#ff9500'}].map((a,i,arr)=>(
                <div key={i} className="flex items-center gap-4 py-3" style={{borderBottom:i<arr.length-1?'1px solid #f5f5f7':'none'}}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{background:a.color}}/>
                  <span className="tag" style={{fontFamily:'"SF Mono",monospace'}}>{a.photo}</span>
                  <span className="text-sm capitalize" style={{color:'#0f172a'}}>{a.action}</span>
                  <span className="text-xs" style={{color:'#94a3b8'}}>by {a.mod}</span>
                  <span className="ml-auto text-xs" style={{color:'#cbd5e1',fontFamily:'"SF Mono",monospace'}}>{a.time}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
