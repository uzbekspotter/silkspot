import { motion, AnimatePresence } from 'motion/react';
import { Camera, Heart, Eye, History, ChevronRight, Download, Share2, X, ChevronLeft, CheckCircle2, AlertTriangle, Archive, Calendar, Zap, ExternalLink, Maximize2, Clock } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

type Status = 'ACTIVE' | 'STORED' | 'SCRAPPED';
type Tab = 'Overview' | 'Gallery' | 'History' | 'Similar';

const ac = {
  reg:'N829AN', type:'Boeing 787-9 Dreamliner', typeShort:'B789', manufacturer:'Boeing',
  msn:'40639', lineNumber:'426', operator:'American Airlines', operatorICAO:'AAL', operatorIATA:'AA',
  status:'ACTIVE' as Status, firstFlight:'12 May 2016', deliveryDate:'27 May 2016', ageYears:8.9,
  engines:'2× GEnx-1B76', config:'C30 / W21 / Y234', totalSeats:285, mtow:'254,011 kg',
  range:'14,140 km', wingspan:'60.1 m', length:'62.8 m', hub:'Dallas/Fort Worth (DFW)',
  icaoHex:'AA9F00', photoCount:342, views:'94.2K', likes:'2.8K',
  coverUrl:'',
};

const specGroups = [
  { title:'Identity', rows:[
    {label:'ICAO Type',    value:'B789',        mono:true },
    {label:'Manufacturer', value:'Boeing',       mono:false},
    {label:'MSN',          value:'40639',        mono:true },
    {label:'Line Number',  value:'426',          mono:true },
    {label:'ICAO 24-bit',  value:'AA9F00',       mono:true },
    {label:'SELCAL',       value:'GH-KR',        mono:true },
  ]},
  { title:'Dimensions & Performance', rows:[
    {label:'Wingspan',     value:'60.1 m',       mono:false},
    {label:'Length',       value:'62.8 m',       mono:false},
    {label:'MTOW',         value:'254,011 kg',   mono:false},
    {label:'Range',        value:'14,140 km',    mono:false},
    {label:'Cruise Speed', value:'Mach 0.85',    mono:false},
    {label:'Engines',      value:'2× GEnx-1B76', mono:false},
  ]},
  { title:'Cabin Configuration', rows:[
    {label:'Business',     value:'30 seats',     mono:false},
    {label:'Premium Eco',  value:'21 seats',     mono:false},
    {label:'Economy',      value:'234 seats',    mono:false},
    {label:'Total',        value:'285 seats',    mono:false},
    {label:'Hub Airport',  value:'DFW',          mono:true },
  ]},
];

const operatorHistory = [
  {reg:'N829AN', operator:'American Airlines', iata:'AA', start:'May 2016', end:null, current:true, livery:'Standard 2013 livery'},
  {reg:'N50217', operator:'Boeing Test Fleet',  iata:'BO', start:'Mar 2016', end:'May 2016', current:false, livery:'Boeing house colors'},
];

// Gallery photos loaded from Supabase
const galleryPhotos: any[] = [];

const similarAircraft = [
  {reg:'N830AN', type:'B787-9', operator:'American Airlines', status:'ACTIVE'  as Status, photos:218, msn:'40640'},
  {reg:'N831AN', type:'B787-9', operator:'American Airlines', status:'ACTIVE'  as Status, photos:189, msn:'40641'},
  {reg:'N832AN', type:'B787-9', operator:'American Airlines', status:'STORED'  as Status, photos:74,  msn:'40642'},
  {reg:'N833AN', type:'B787-9', operator:'American Airlines', status:'ACTIVE'  as Status, photos:156, msn:'40643'},
];

const StatusBadge = ({ status }: { status: Status }) => {
  const map = { ACTIVE:{cls:'status-active',label:'Active'}, STORED:{cls:'status-stored',label:'Stored'}, SCRAPPED:{cls:'status-scrapped',label:'Scrapped'} };
  const {cls,label} = map[status];
  return <span className={`${cls} text-xs font-medium px-2.5 py-1`}>{label}</span>;
};

const Lightbox = ({ photo, onClose, onPrev, onNext }: {photo:typeof galleryPhotos[0]; onClose:()=>void; onPrev:()=>void; onNext:()=>void}) => (
  <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
    style={{background:'rgba(0,0,0,0.92)',backdropFilter:'blur(20px)'}} onClick={onClose}>
    <div className="flex items-center justify-between w-full max-w-5xl px-6 py-4" onClick={e=>e.stopPropagation()}>
      <div className="flex items-center gap-3">
        <span className="tag-accent">{photo.category}</span>
        <span className="text-sm" style={{color:'rgba(255,255,255,0.7)'}}>{photo.airport} · {photo.date}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm flex items-center gap-1.5" style={{color:'rgba(255,255,255,0.6)'}}><Camera className="w-3.5 h-3.5"/>{photo.spotter}</span>
        <button onClick={onClose} className="p-2 rounded-full" style={{background:'rgba(255,255,255,0.1)',color:'#fff'}}><X className="w-4 h-4"/></button>
      </div>
    </div>
    <div className="flex items-center gap-4 px-6 w-full max-w-5xl" onClick={e=>e.stopPropagation()}>
      <button onClick={e=>{e.stopPropagation();onPrev();}} className="p-3 rounded-full" style={{background:'rgba(255,255,255,0.1)',color:'#fff'}}><ChevronLeft className="w-5 h-5"/></button>
      <img src={photo.url} className="flex-1 rounded-2xl object-contain" style={{maxHeight:'70vh'}} referrerPolicy="no-referrer"/>
      <button onClick={e=>{e.stopPropagation();onNext();}} className="p-3 rounded-full" style={{background:'rgba(255,255,255,0.1)',color:'#fff'}}><ChevronRight className="w-5 h-5"/></button>
    </div>
  </motion.div>
);

export const AircraftDetailPage = () => {
  const [tab, setTab] = useState<Tab>('Overview');
  const [lbIdx, setLbIdx] = useState<number|null>(null);
  const [liked, setLiked] = useState(false);
  const TABS: Tab[] = ['Overview','Gallery','History','Similar'];

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{background:'#fff',minHeight:'100vh'}}>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{height:440}}>
        <img src={ac.coverUrl} className="absolute inset-0 w-full h-full object-cover" style={{opacity:0.4}} referrerPolicy="no-referrer"/>
        <div className="absolute inset-0" style={{background:'linear-gradient(to right,rgba(255,255,255,0.95) 30%,rgba(255,255,255,0.5) 65%,transparent 100%)'}}/>
        <div className="relative z-10 h-full flex flex-col justify-end pb-0 site-w">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StatusBadge status={ac.status}/>
                <span className="tag">{ac.typeShort}</span>
              </div>
              <h1 className="font-headline text-6xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.03em'}}>{ac.reg}</h1>
              <div>
                <div className="text-xl font-medium" style={{color:'#475569',letterSpacing:'-0.01em'}}>{ac.type}</div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm" style={{color:'#94a3b8'}}>
                  <span style={{fontFamily:'"SF Mono",monospace'}}>MSN {ac.msn}</span>
                  <span>·</span><span>{ac.manufacturer}</span>
                  <span>·</span><span>First flight {ac.firstFlight}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[{Icon:Share2,label:'Share'},{Icon:Download,label:'Export'}].map(({Icon,label})=>(
                <button key={label} className="btn-outline" style={{height:36,padding:'0 16px',fontSize:13}}>
                  <Icon className="w-3.5 h-3.5"/>{label}
                </button>
              ))}
              <button onClick={()=>setLiked(v=>!v)}
                className={liked?'btn-primary':'btn-outline'}
                style={{height:36,padding:'0 16px',fontSize:13,gap:6}}>
                <Heart className={`w-3.5 h-3.5 ${liked?'fill-current':''}`}/>
                {liked?'Liked':'Like'} · {ac.likes}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div className="site-w flex items-stretch overflow-x-auto no-scrollbar">
          {[{Icon:Camera,val:ac.photoCount,label:'photos'},{Icon:Eye,val:ac.views,label:'views'},{Icon:Heart,val:ac.likes,label:'likes'}].map(({Icon,val,label},i)=>(
            <div key={label} className="flex items-center gap-2 px-8 py-4 shrink-0"
              style={{borderRight:i<2?'1px solid #e8e8ed':'none'}}>
              <Icon className="w-4 h-4" style={{color:'#94a3b8'}}/>
              <span className="font-semibold text-sm" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{val}</span>
              <span className="text-sm" style={{color:'#94a3b8'}}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',position:'sticky',top:52,zIndex:40}}>
        <div className="site-w flex items-center gap-0">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className="text-sm px-6 py-4 transition-all font-medium"
              style={{
                color:tab===t?'#0f172a':'#475569',
                borderBottom:tab===t?'2px solid #0f172a':'2px solid transparent',
                fontWeight:tab===t?500:400,
              }}>
              {t}{t==='Gallery'&&<span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{background:'#f8fafc',color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{ac.photoCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="site-w py-10">
        <AnimatePresence mode="wait">

          {/* OVERVIEW */}
          {tab==='Overview'&&(
            <motion.div key="ov" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-7 space-y-5">
                {specGroups.map((group,gi)=>(
                  <motion.div key={group.title} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:gi*0.06}}
                    className="card overflow-hidden">
                    <div className="px-6 py-4" style={{borderBottom:'1px solid #f5f5f7',background:'#f8fafc'}}>
                      <h3 className="text-sm font-semibold" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{group.title}</h3>
                    </div>
                    <div className="px-6">
                      {group.rows.map((row,ri)=>(
                        <div key={row.label} className="flex items-center justify-between py-3"
                          style={{borderBottom:ri<group.rows.length-1?'1px solid #f5f5f7':'none'}}>
                          <span className="text-sm" style={{color:'#94a3b8'}}>{row.label}</span>
                          <span className="text-sm font-medium" style={{color:row.mono?'#0ea5e9':'#0f172a',fontFamily:row.mono?'"SF Mono",monospace':undefined}}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="xl:col-span-5 space-y-5">
                {/* Vitals */}
                <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
                  className="card-gray p-6 rounded-2xl">
                  <h3 className="text-sm font-semibold mb-5" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Aircraft Vitals</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[{label:'Age',value:`${ac.ageYears}y`},{label:'Range',value:'14,140 km'},{label:'Seats',value:ac.totalSeats},{label:'MTOW',value:'254K kg'}].map(v=>(
                      <div key={v.label} className="card p-4">
                        <div className="text-xs mb-1" style={{color:'#94a3b8'}}>{v.label}</div>
                        <div className="text-xl font-semibold" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{v.value}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
                {/* Operator */}
                <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.17}} className="card p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Current Operator</h3>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg"
                      style={{background:'#f8fafc',color:'#0f172a'}}>{ac.operatorIATA}</div>
                    <div>
                      <div className="font-semibold" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{ac.operator}</div>
                      <div className="text-xs mt-0.5" style={{color:'#94a3b8'}}>Hub: {ac.hub}</div>
                    </div>
                  </div>
                  {[{label:'Registration',value:ac.reg,mono:true},{label:'Since',value:ac.deliveryDate,mono:false},{label:'Config',value:ac.config,mono:false},{label:'ICAO Hex',value:ac.icaoHex,mono:true}].map(row=>(
                    <div key={row.label} className="flex items-center justify-between py-3"
                      style={{borderTop:'1px solid #f5f5f7'}}>
                      <span className="text-sm" style={{color:'#94a3b8'}}>{row.label}</span>
                      <span className="text-sm font-medium" style={{color:row.mono?'#0ea5e9':'#0f172a',fontFamily:row.mono?'"SF Mono",monospace':undefined}}>{row.value}</span>
                    </div>
                  ))}
                  <button className="btn-secondary w-full mt-4 justify-center" style={{height:38,fontSize:13}}>
                    <ExternalLink className="w-3.5 h-3.5"/>View airline fleet
                  </button>
                </motion.div>
                {/* Airport bars */}
                <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.24}} className="card p-6">
                  <h3 className="text-sm font-semibold mb-4" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Top spotting airports</h3>
                  {[{code:'DFW',count:89,pct:26},{code:'LAX',count:67,pct:20},{code:'JFK',count:54,pct:16},{code:'LHR',count:41,pct:12}].map(ap=>(
                    <div key={ap.code} className="mb-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="tag">{ap.code}</span>
                        <span className="text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{ap.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{background:'#f8fafc'}}>
                        <motion.div className="h-1.5 rounded-full" initial={{width:0}} animate={{width:`${ap.pct}%`}} transition={{duration:0.6,delay:0.3}} style={{background:'#0f172a'}}/>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* GALLERY */}
          {tab==='Gallery'&&(
            <motion.div key="gal" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {['All','Takeoff','Landing','Static','Air-to-Air'].map(f=>(
                    <button key={f} className="btn-outline" style={{height:34,padding:'0 14px',fontSize:12}}>{f}</button>
                  ))}
                </div>
                <span className="text-sm" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{ac.photoCount} photos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {galleryPhotos.map((photo,i)=>(
                  <motion.div key={photo.id}
                    initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
                    className={`card cursor-pointer group overflow-hidden ${i===0?'md:col-span-2':''}`}
                    onClick={()=>setLbIdx(i)}>
                    <div className={`relative overflow-hidden ${i===0?'aspect-[16/9]':'aspect-[4/3]'}`} style={{borderRadius:'18px 18px 0 0'}}>
                      <img src={photo.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" referrerPolicy="no-referrer"/>
                      <div className="photo-overlay absolute inset-0"/>
                      <div className="absolute top-3 left-3"><span className="tag" style={{background:'rgba(255,255,255,0.9)',color:'#525252',border:'none'}}>{photo.category}</span></div>
                      <div className="absolute top-3 right-3 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" style={{background:'rgba(0,0,0,0.4)'}}>
                        <Maximize2 className="w-3.5 h-3.5 text-white"/>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="text-sm font-medium mb-0.5" style={{color:'rgba(255,255,255,0.9)'}}>{photo.airport} · {photo.date}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs flex items-center gap-1.5" style={{color:'rgba(255,255,255,0.6)'}}><Camera className="w-3 h-3"/>{photo.spotter}</span>
                          <div className="flex items-center gap-3 text-xs" style={{color:'rgba(255,255,255,0.5)',fontFamily:'"SF Mono",monospace'}}>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{photo.views.toLocaleString('en-US')}</span>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{photo.likes}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="text-center mt-8">
                <button className="btn-outline" style={{height:40,padding:'0 28px',fontSize:13}}>Load more photos</button>
              </div>
            </motion.div>
          )}

          {/* HISTORY */}
          {tab==='History'&&(
            <motion.div key="hist" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="max-w-3xl">
              <h2 className="font-headline text-2xl font-bold mb-8 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Operator History</h2>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-4 w-px" style={{background:'#e2e8f0'}}/>
                <div className="space-y-5">
                  {operatorHistory.map((entry,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.1}}
                      className="flex gap-6">
                      <div className="shrink-0 flex items-start justify-center pt-5" style={{width:40}}>
                        <div className="w-3 h-3 rounded-full"
                          style={{background:entry.current?'#0f172a':'#e2e8f0',border:`2px solid ${entry.current?'#0f172a':'#e2e8f0'}`}}/>
                      </div>
                      <div className="flex-1 card p-5 mb-1">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                              style={{background:'#f8fafc',color:'#0f172a'}}>{entry.iata}</div>
                            <div>
                              <div className="font-semibold" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{entry.operator}</div>
                              <div className="text-xs mt-0.5" style={{color:'#94a3b8'}}>{entry.livery}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',fontSize:14}}>{entry.reg}</span>
                            {entry.current&&<span className="status-active text-xs px-2 py-0.5">Current</span>}
                          </div>
                        </div>
                        <div className="text-sm flex items-center gap-2" style={{color:'#94a3b8'}}>
                          <Clock className="w-3.5 h-3.5"/>
                          {entry.start} → {entry.end??'Present'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                {[{Icon:Calendar,label:'First Flight',value:ac.firstFlight},{Icon:Zap,label:'Delivery',value:ac.deliveryDate},{Icon:History,label:'Age',value:`${ac.ageYears} years`},{Icon:Camera,label:'Photos',value:ac.photoCount}].map(({Icon,label,value})=>(
                  <div key={label} className="card-gray p-4 rounded-2xl">
                    <Icon className="w-4 h-4 mb-3" style={{color:'#94a3b8'}}/>
                    <div className="text-xs mb-0.5" style={{color:'#94a3b8'}}>{label}</div>
                    <div className="text-sm font-medium" style={{color:'#0f172a'}}>{value}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* SIMILAR */}
          {tab==='Similar'&&(
            <motion.div key="sim" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <h2 className="font-headline text-2xl font-bold mb-8 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Same Fleet · American Airlines B787-9</h2>
              <div className="space-y-3">
                {similarAircraft.map((a,i)=>(
                  <motion.div key={a.reg} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.07}}
                    className="card flex items-center gap-5 p-5 cursor-pointer group">
                    <span className="text-xs w-4 text-right" style={{color:'#e2e8f0',fontFamily:'"SF Mono",monospace'}}>{i+1}</span>
                    <div className="font-headline text-2xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em',minWidth:100}}>{a.reg}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm" style={{color:'#475569'}}>{a.type}</div>
                      <div className="text-xs mt-0.5" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>MSN {a.msn}</div>
                    </div>
                    <StatusBadge status={a.status}/>
                    <div className="flex items-center gap-1.5 text-sm shrink-0" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>
                      <Camera className="w-3.5 h-3.5"/>{a.photos}
                    </div>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" style={{color:'#e2e8f0'}}/>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {lbIdx!==null&&(
          <Lightbox photo={galleryPhotos[lbIdx]} onClose={()=>setLbIdx(null)}
            onPrev={()=>setLbIdx(i=>i!==null?(i-1+galleryPhotos.length)%galleryPhotos.length:null)}
            onNext={()=>setLbIdx(i=>i!==null?(i+1)%galleryPhotos.length:null)}/>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
