import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, XCircle, AlertCircle, AlertTriangle,
  BarChart3, Crosshair, Grid3X3, Layers, Scan, ZoomIn,
  RotateCcw, X, Sliders, Eye, LineChart, Gauge
} from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';

// ── Site requirements ─────────────────────────────────────
const REQUIREMENTS = {
  minWidth:           1800,
  minHeight:          1200,
  maxFileMb:          50,
  minSharpness:       60,
  maxNoise:           60,
  maxHorizonDeg:      2.0,
  maxDustSpots:       2,
  maxClipHighlight:   5,
  maxClipShadow:      8,
  allowedAspects:     ['3:2', '4:3', '16:9', '2:1'],
  minMetadataScore:   50,
};

interface CheckResult {
  id:       string;
  label:    string;
  pass:     boolean;
  warn:     boolean;   // pass but borderline
  value:    string;
  required: string;
  note?:    string;
}

interface Metrics {
  sharpness:         number;
  noiseLevel:        number;
  exposure:          number;
  horizonAngle:      number;
  clippedHighlights: number;
  clippedShadows:    number;
  dustSpots:         {x:number; y:number; radius:number; confidence:number}[];
  histogram:         { r:number[]; g:number[]; b:number[]; luma:number[] };
  aspectRatio:       string;
  hasWatermark:      boolean;
  watermarkConf:     number;
  colorSpace:        string;
  estimatedISO:      number;
}

function genMetrics(url: string, w: number, h: number): Metrics {
  let s = 0;
  for (let i = 0; i < url.length; i++) s = (s * 31 + url.charCodeAt(i)) & 0xffffffff;
  const r = (min:number, max:number, off=0) => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return min + (Math.abs(s + off) % 10000) / 10000 * (max - min);
  };
  const mkH = (peak:number, spread:number) =>
    Array.from({length:256}, (_,i) => {
      const d = (i - peak) / spread;
      return Math.max(0, Math.round(Math.exp(-0.5*d*d) * 1800 + r(-40,40,i)));
    });
  const rp=Math.round(r(80,180)), gp=Math.round(r(85,175)), bp=Math.round(r(70,165));
  const rv=mkH(rp,45), gv=mkH(gp,48), bv=mkH(bp,42);
  const luma=Array.from({length:256},(_,i)=>Math.round(rv[i]*.299+gv[i]*.587+bv[i]*.114));
  const dc=Math.floor(r(0,3.9));
  return {
    sharpness:         Math.round(r(48, 97)),
    noiseLevel:        Math.round(r(8,  58)),
    exposure:          parseFloat(r(-1.2, 1.1).toFixed(2)),
    horizonAngle:      parseFloat(r(-4.5, 4.5).toFixed(1)),
    clippedHighlights: parseFloat(r(0.2, 6.8).toFixed(1)),
    clippedShadows:    parseFloat(r(0.3, 9.2).toFixed(1)),
    dustSpots:         Array.from({length:dc},(_,i)=>({x:r(.05,.95,i*100),y:r(.05,.9,i*200),radius:r(.007,.028,i*300),confidence:r(.55,.96,i*400)})),
    histogram:         {r:rv, g:gv, b:bv, luma},
    aspectRatio:       (()=>{const g=(a:number,b:number):number=>b===0?a:g(b,a%b);const d=g(w,h);const aw=w/d,ah=h/d;return aw>10?`${Math.round(w/h*10)/10}:1`:`${aw}:${ah}`;})(),
    hasWatermark:      r(0,1) > 0.75,
    watermarkConf:     parseFloat(r(0.55, 0.93).toFixed(2)),
    colorSpace:        r(0,1)>.15 ? 'sRGB' : 'AdobeRGB',
    estimatedISO:      [100,200,400,800,1600,3200][Math.floor(r(0,5.9))],
  };
}

function runChecks(m: Metrics, w: number, h: number, fileMb: number, metaScore: number): CheckResult[] {
  const req = REQUIREMENTS;
  const pass = (v:boolean,w2?:boolean): Pick<CheckResult,'pass'|'warn'> => ({pass:v,warn:!v?false:!!w2});

  return [
    {
      id:'resolution', label:'Minimum Resolution',
      ...pass(w >= req.minWidth && h >= req.minHeight),
      value: `${w.toLocaleString('en-US')} × ${h.toLocaleString('en-US')} px`,
      required: `≥ ${req.minWidth.toLocaleString('en-US')} × ${req.minHeight.toLocaleString('en-US')} px`,
      note: w < req.minWidth || h < req.minHeight ? 'Image too small — will be rejected' : undefined,
    },
    {
      id:'aspect', label:'Aspect Ratio',
      ...pass(req.allowedAspects.includes(m.aspectRatio), req.allowedAspects.includes(m.aspectRatio)),
      value: m.aspectRatio,
      required: req.allowedAspects.join(' / '),
      note: !req.allowedAspects.includes(m.aspectRatio) ? 'Non-standard crop — verify intentional' : undefined,
    },
    {
      id:'filesize', label:'File Size',
      ...pass(fileMb <= req.maxFileMb, fileMb > req.maxFileMb * 0.85),
      value: `${fileMb} MB`,
      required: `≤ ${req.maxFileMb} MB`,
    },
    {
      id:'sharpness', label:'Sharpness',
      ...pass(m.sharpness >= req.minSharpness, m.sharpness < req.minSharpness + 15),
      value: `${m.sharpness}/100`,
      required: `≥ ${req.minSharpness}/100`,
      note: m.sharpness < req.minSharpness ? 'Out of focus or motion blur detected' : undefined,
    },
    {
      id:'noise', label:'Noise Level',
      ...pass(m.noiseLevel <= req.maxNoise, m.noiseLevel > req.maxNoise * 0.8),
      value: `${m.noiseLevel}/100`,
      required: `≤ ${req.maxNoise}/100`,
      note: m.noiseLevel > req.maxNoise ? 'Excessive noise — high ISO or poor light' : undefined,
    },
    {
      id:'horizon', label:'Horizon Level',
      ...pass(Math.abs(m.horizonAngle) <= req.maxHorizonDeg, Math.abs(m.horizonAngle) > req.maxHorizonDeg * 0.7),
      value: `${m.horizonAngle > 0 ? '+' : ''}${m.horizonAngle}°`,
      required: `≤ ±${req.maxHorizonDeg}°`,
      note: Math.abs(m.horizonAngle) > req.maxHorizonDeg ? 'Horizon not level — correction required' : undefined,
    },
    {
      id:'highlight', label:'Highlight Clipping',
      ...pass(m.clippedHighlights <= req.maxClipHighlight, m.clippedHighlights > req.maxClipHighlight * 0.7),
      value: `${m.clippedHighlights}%`,
      required: `≤ ${req.maxClipHighlight}%`,
      note: m.clippedHighlights > req.maxClipHighlight ? 'Overexposed highlights — key detail lost' : undefined,
    },
    {
      id:'shadow', label:'Shadow Clipping',
      ...pass(m.clippedShadows <= req.maxClipShadow, m.clippedShadows > req.maxClipShadow * 0.7),
      value: `${m.clippedShadows}%`,
      required: `≤ ${req.maxClipShadow}%`,
    },
    {
      id:'dust', label:'Dust / Sensor Spots',
      ...pass(m.dustSpots.filter(d=>d.confidence>.7).length <= req.maxDustSpots),
      value: `${m.dustSpots.filter(d=>d.confidence>.7).length} detected`,
      required: `≤ ${req.maxDustSpots} spots`,
      note: m.dustSpots.filter(d=>d.confidence>.7).length > req.maxDustSpots ? 'Sensor dust visible — ask spotter to clean or remove' : undefined,
    },
    {
      id:'watermark', label:'No Watermark / Logo',
      ...pass(!m.hasWatermark),
      value: m.hasWatermark ? `Detected (${Math.round(m.watermarkConf*100)}% conf.)` : 'None detected',
      required: 'No watermarks',
      note: m.hasWatermark ? 'Watermark or signature overlay detected — reject' : undefined,
    },
    {
      id:'colorspace', label:'Colour Space',
      ...pass(m.colorSpace === 'sRGB', false),
      value: m.colorSpace,
      required: 'sRGB',
      note: m.colorSpace !== 'sRGB' ? 'AdobeRGB will render incorrectly in browser — request conversion' : undefined,
    },
    {
      id:'metadata', label:'Metadata Completeness',
      ...pass(metaScore >= req.minMetadataScore, metaScore < req.minMetadataScore + 20),
      value: `${metaScore}/100`,
      required: `≥ ${req.minMetadataScore}/100`,
      note: metaScore < req.minMetadataScore ? 'Too many required fields missing' : undefined,
    },
  ];
}

// ── Histogram mini chart ──────────────────────────────────
const HistBar = ({data,color,label,height=44}:{data:number[];color:string;label:string;height?:number}) => {
  const mx = Math.max(...data,1);
  const bars = Array.from({length:64},(_,i)=>Math.max(...data.slice(i*4,(i+1)*4))/mx);
  return (
    <div>
      <div className="text-xs font-medium mb-1" style={{color:'#94a3b8',fontSize:10,letterSpacing:'0.08em',textTransform:'uppercase'}}>{label}</div>
      <div className="flex items-end gap-px" style={{height,background:'#0a0a0a',borderRadius:6,padding:'3px 3px 0'}}>
        {bars.map((h,i)=><div key={i} className="flex-1 rounded-sm" style={{height:`${Math.max(h*100,1)}%`,background:color,opacity:.85}}/>)}
      </div>
    </div>
  );
};

/** Compact RGB composite (overlay on preview). */
const RgbHistogramMini = ({r,g,b}:{r:number[];g:number[];b:number[]}) => {
  const W = 256, H = 52;
  const max = Math.max(...r, ...g, ...b, 1);
  const line = (arr: number[]) =>
    arr.map((v, i) => `${(i / (arr.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`).join(' L ');
  const area = (arr: number[]) => `M0,${H} L ${line(arr)} L ${W},${H} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block" aria-hidden>
      <path d={area(b)} fill="rgba(10,132,255,0.18)" stroke="rgba(10,132,255,0.85)" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
      <path d={area(g)} fill="rgba(48,209,88,0.12)" stroke="rgba(48,209,88,0.75)" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
      <path d={area(r)} fill="rgba(255,69,58,0.12)" stroke="rgba(255,69,58,0.75)" strokeWidth="0.75" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
};

// ── Horizon bubble ────────────────────────────────────────
const HorizonBubble = ({angle}:{angle:number}) => {
  const abs=Math.abs(angle), ok=abs<.5, warn=abs<REQUIREMENTS.maxHorizonDeg, bad=abs>=REQUIREMENTS.maxHorizonDeg;
  const color=ok?'#34c759':warn?'#ff9500':'#ff3b30';
  const clamp=Math.max(-8,Math.min(8,angle));
  return (
    <div>
      <div className="flex justify-between mb-2 text-xs" style={{color:'#94a3b8'}}>
        <span>Horizon Level</span>
        <span style={{color,fontFamily:'"SF Mono",monospace'}}>{angle>0?'+':''}{angle}°</span>
      </div>
      <div className="relative flex items-center px-3" style={{height:30,background:'#0a0a0a',borderRadius:8,border:'1px solid #1c1c1c'}}>
        {[-6,-4,-2,0,2,4,6].map(t=><div key={t} className="absolute" style={{left:`${50+t*5.5}%`,top:4,bottom:4,width:1,background:t===0?'#444':'#222'}}/>)}
        <motion.div animate={{left:`${50+clamp*5.5}%`}} transition={{type:'spring',stiffness:200,damping:28}}
          className="absolute w-5 h-5 rounded-full -translate-x-1/2" style={{background:color}}/>
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px" style={{background:'#555'}}/>
      </div>
      <div className="text-xs text-center mt-1" style={{color}}>
        {ok?'Level ✓':warn?`Slight tilt — ${angle>0?'CW':'CCW'}`:`Fix required — ${Math.abs(angle).toFixed(1)}° off`}
      </div>
    </div>
  );
};

// ── Overlay modes (preview + optional floating readouts) ──
type Overlay='none'|'grid'|'thirds'|'center'|'dust'|'focus'|'horizon'|'histLuma'|'histRgb';

const ScreenerToolBtn = ({
  active, icon: Icon, label, title, onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  title?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    title={title ?? label}
    onClick={onClick}
    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400"
    style={{
      background: active ? '#0f172a' : '#ffffff',
      color: active ? '#f8fafc' : '#334155',
      border: `1px solid ${active ? '#0f172a' : '#e2e8f0'}`,
      boxShadow: active ? '0 1px 3px rgba(15,23,42,0.12)' : '0 1px 2px rgba(15,23,42,0.04)',
    }}
  >
    <Icon className="w-4 h-4 shrink-0" strokeWidth={active ? 2.25 : 2} />
    <span className="whitespace-nowrap">{label}</span>
  </button>
);

// ── Main ──────────────────────────────────────────────────
interface Props {
  photoUrl:string; reg:string; width:number; height:number;
  sizeMb:number; metadataScore:number; category:string; shotDate:string; spotter:string;
  onClose?:()=>void;
}

type Tab='requirements'|'inspect'|'histogram'|'duplicates';

export const PhotoReviewTools = ({photoUrl,reg,width,height,sizeMb,metadataScore,category,shotDate,spotter,onClose}:Props) => {
  const [tab,     setTab]     = useState<Tab>('requirements');
  const [overlay, setOverlay] = useState<Overlay>('none');
  const [metrics, setMetrics] = useState<Metrics|null>(null);
  const [checks,  setChecks]  = useState<CheckResult[]>([]);
  const [zoom,    setZoom]    = useState(1);

  useEffect(()=>{
    const m = genMetrics(photoUrl, width, height);
    const c = runChecks(m, width, height, sizeMb, metadataScore);
    setMetrics(m); setChecks(c);
  },[photoUrl,width,height,sizeMb,metadataScore]);

  if(!metrics) return (
    <div className="flex items-center justify-center rounded-2xl" style={{height:300,background:'#f8fafc'}}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{borderColor:'#e2e8f0',borderTopColor:'#0ea5e9'}}/>
    </div>
  );

  const passed  = checks.filter(c=>c.pass&&!c.warn).length;
  const warned  = checks.filter(c=>c.pass&&c.warn).length;
  const failed  = checks.filter(c=>!c.pass).length;
  const verdict = failed>0?'REJECT': warned>2?'REVIEW': 'APPROVE';
  const verdictColor = verdict==='APPROVE'?'#34c759':verdict==='REVIEW'?'#ff9500':'#dc2626';
  const verdictBg    = verdict==='APPROVE'?'#f0fdf4':verdict==='REVIEW'?'#fffbeb':'#fef2f2';

  const TABS=[
    {id:'requirements' as Tab, label:'Requirements', badge:failed>0?failed:undefined, badgeColor:'#dc2626'},
    {id:'inspect'      as Tab, label:'Inspect'},
    {id:'histogram'    as Tab, label:'Histogram'},
    {id:'duplicates'   as Tab, label:'Duplicates', badge:undefined},
  ];

  const dupes = [
    {sim:94,reg,date:'2024-11-12',spotter:'K. Anderson'},
    {sim:71,reg,date:'2024-08-03',spotter:'J. Dupont'},
    {sim:29,reg,date:'2025-01-19',spotter:'M. Webb'},
  ];
  const hasDupe = dupes.some(d=>d.sim>85);

  return (
    <div className="rounded-2xl overflow-hidden" style={{background:'#fff',border:'1px solid #e8e8ed'}}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3" style={{background:'#f8fafc',borderBottom:'1px solid #e8e8ed'}}>
        <div className="flex items-center gap-3">
          <Sliders className="w-4 h-4" style={{color:'#0f172a'}}/>
          <span className="font-semibold text-sm tracking-tight" style={{color:'#0f172a'}}>Review Tools</span>
          <span className="tag" style={{fontFamily:'"SF Mono",monospace'}}>{reg}</span>
        </div>
        {/* Verdict pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{background:verdictBg,color:verdictColor,border:`1px solid ${verdictColor}30`}}>
            {verdict==='APPROVE'&&<CheckCircle2 className="w-3.5 h-3.5"/>}
            {verdict==='REVIEW' &&<AlertTriangle className="w-3.5 h-3.5"/>}
            {verdict==='REJECT' &&<XCircle className="w-3.5 h-3.5"/>}
            {verdict}
            <span style={{opacity:.7}}>· {passed} pass · {warned} warn · {failed} fail</span>
          </div>
          {onClose&&<button onClick={onClose} className="p-1.5 rounded-lg" style={{color:'#94a3b8'}}
            onMouseEnter={e=>e.currentTarget.style.color='#0f172a'} onMouseLeave={e=>e.currentTarget.style.color='#94a3b8'}>
            <X className="w-4 h-4"/></button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{borderBottom:'1px solid #e8e8ed'}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex items-center gap-2 px-5 py-3 text-sm transition-all"
            style={{color:tab===t.id?'#0f172a':'#475569',borderBottom:tab===t.id?'2px solid #0f172a':'2px solid transparent',fontWeight:tab===t.id?500:400}}>
            {t.label}
            {t.badge!=null&&<span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{background:t.badgeColor,color:'#fff',fontSize:10}}>{t.badge}</span>}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12">

        {/* Photo */}
        <div className="xl:col-span-7 relative" style={{background:'#0a0a0a',minHeight:340}}>
          <div className="relative overflow-hidden" style={{minHeight:340}}>
            <motion.div animate={{scale:zoom}} transition={{type:'spring',stiffness:300,damping:30}}
              className="w-full relative" style={{transformOrigin:'center center'}}>
              <div
                className="w-full h-full"
                style={
                  overlay === 'dust'
                    ? { filter: 'contrast(1.72) saturate(0.32) brightness(1.04)' }
                    : undefined
                }
              >
                <img src={photoUrl} alt={reg} className="w-full h-full object-contain select-none" style={{minHeight:340}} draggable={false} referrerPolicy="no-referrer"/>
              </div>

              {/* Grid */}
              {overlay==='grid'&&<div className="absolute inset-0 pointer-events-none">
                {[1,2,3,4,5,6,7,8].map(i=><React.Fragment key={i}>
                  <div className="absolute w-full" style={{top:`${i*11.11}%`,height:1,background:'rgba(255,255,255,.15)'}}/>
                  <div className="absolute h-full" style={{left:`${i*11.11}%`,width:1,background:'rgba(255,255,255,.15)'}}/>
                </React.Fragment>)}
              </div>}

              {/* Rule of thirds */}
              {overlay==='thirds'&&<div className="absolute inset-0 pointer-events-none">
                {[1,2].map(i=><React.Fragment key={i}>
                  <div className="absolute w-full" style={{top:`${i*33.33}%`,height:1,background:'rgba(255,200,0,.55)'}}/>
                  <div className="absolute h-full" style={{left:`${i*33.33}%`,width:1,background:'rgba(255,200,0,.55)'}}/>
                </React.Fragment>)}
                {[1,2].flatMap(r=>[1,2].map(c=>(
                  <div key={`${r}${c}`} className="absolute w-3 h-3 rounded-full border-2"
                    style={{top:`calc(${r*33.33}% - 6px)`,left:`calc(${c*33.33}% - 6px)`,borderColor:'rgba(255,200,0,.8)'}}/>
                )))}
              </div>}

              {/* Center */}
              {overlay==='center'&&<div className="absolute inset-0 pointer-events-none">
                <div className="absolute w-full" style={{top:'50%',height:1,background:'rgba(0,200,255,.5)'}}/>
                <div className="absolute h-full" style={{left:'50%',width:1,background:'rgba(0,200,255,.5)'}}/>
                {[8,16,25,38].map(r=>(
                  <div key={r} className="absolute rounded-full border" style={{width:`${r*2}%`,height:`${r*2}%`,top:`${50-r}%`,left:`${50-r}%`,borderColor:'rgba(0,200,255,.2)'}}/>
                ))}
              </div>}

              {/* Dust */}
              {overlay==='dust'&&metrics.dustSpots.map((sp,i)=>(
                <div key={i} className="absolute pointer-events-none"
                  style={{left:`${sp.x*100}%`,top:`${sp.y*100}%`,width:`${sp.radius*200}%`,height:`${sp.radius*200}%`,transform:'translate(-50%,-50%)',borderRadius:'50%',border:`2px solid rgba(255,59,48,${sp.confidence})`,boxShadow:'0 0 8px rgba(255,59,48,.4)'}}>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full whitespace-nowrap"
                    style={{background:'#ff3b30',color:'#fff',fontSize:9}}>
                    {Math.round(sp.confidence*100)}%
                  </div>
                </div>
              ))}

              {/* Focus zones */}
              {overlay==='focus'&&<div className="absolute inset-0 pointer-events-none">
                <div className="absolute rounded-2xl" style={{top:'18%',left:'18%',right:'18%',bottom:'22%',border:'2px solid rgba(52,199,89,.7)',background:'rgba(52,199,89,.05)'}}>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full whitespace-nowrap" style={{background:'#34c759',color:'#fff',fontSize:9}}>Sharp · {metrics.sharpness}%</div>
                </div>
                {[{t:'0%',l:'0%'},{t:'0%',r:'0%'},{b:'0%',l:'0%'},{b:'0%',r:'0%'}].map((s,i)=>(
                  <div key={i} className="absolute" style={{...s,width:'20%',height:'22%',border:'1px solid rgba(255,159,0,.4)',background:'rgba(255,159,0,.05)'}}/>
                ))}
              </div>}

              {/* Horizon guide (synthetic angle from QC pipeline placeholder) */}
              {overlay==='horizon'&&(
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div
                    style={{
                      width: '160%',
                      height: 2,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(250,204,21,0.92) 12%, rgba(250,204,21,0.92) 88%, transparent 100%)',
                      transform: `rotate(${-metrics.horizonAngle}deg)`,
                      transformOrigin: 'center center',
                      boxShadow: '0 0 14px rgba(250,204,21,0.35)',
                    }}
                  />
                  <div
                    className="absolute bottom-3 left-3 px-2 py-1 rounded-md text-xs font-semibold pointer-events-none"
                    style={{
                      background: 'rgba(0,0,0,0.72)',
                      color: '#fde68a',
                      fontFamily: '"SF Mono",monospace',
                      border: '1px solid rgba(250,204,21,0.35)',
                    }}
                  >
                    {metrics.horizonAngle > 0 ? '+' : ''}{metrics.horizonAngle}°
                  </div>
                </div>
              )}

              {/* Floating luminance histogram on preview */}
              {overlay==='histLuma'&&(
                <div
                  className="absolute left-2 right-2 bottom-2 rounded-lg p-2 pointer-events-none"
                  style={{
                    background: 'rgba(8,8,10,0.88)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: 420,
                    margin: '0 auto',
                  }}
                >
                  <HistBar data={metrics.histogram.luma} color="#a1a1aa" label="Luminance (preview)" height={36} />
                </div>
              )}

              {overlay==='histRgb'&&(
                <div
                  className="absolute left-2 right-2 bottom-2 rounded-lg p-2 pt-1 pointer-events-none"
                  style={{
                    background: 'rgba(8,8,10,0.88)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: 420,
                    margin: '0 auto',
                  }}
                >
                  <div className="text-[10px] font-medium mb-1" style={{color:'#94a3b8',letterSpacing:'0.08em',textTransform:'uppercase'}}>RGB composite</div>
                  <RgbHistogramMini r={metrics.histogram.r} g={metrics.histogram.g} b={metrics.histogram.b} />
                </div>
              )}
            </motion.div>
          </div>

          {/* Zoom strip */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1.5 rounded-xl"
            style={{background:'rgba(0,0,0,.65)',backdropFilter:'blur(8px)'}}>
            <button onClick={()=>setZoom(z=>Math.max(1,z-.5))} style={{color:'#fff',opacity:zoom>1?1:.4,width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>−</button>
            <span style={{color:'#fff',fontFamily:'"SF Mono",monospace',fontSize:11,minWidth:34,textAlign:'center'}}>{Math.round(zoom*100)}%</span>
            <button onClick={()=>setZoom(z=>Math.min(4,z+.5))} style={{color:'#fff',opacity:zoom<4?1:.4,width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>+</button>
            {zoom>1&&<button onClick={()=>setZoom(1)} style={{color:'#94a3b8',marginLeft:2}}><RotateCcw className="w-3 h-3"/></button>}
          </div>

          {/* Screener tool strip — primary QC controls */}
          <div className="border-t px-4 py-3" style={{borderColor:'#1f2937',background:'#111827'}}>
            <p className="text-xs leading-relaxed mb-3" style={{color:'#94a3b8'}}>
              Use the tools below to check your photo for imperfections. Metrics are illustrative until a live analysis pipeline is connected.
            </p>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest w-full sm:w-auto sm:mr-1" style={{color:'#64748b'}}>Analysis</span>
                <ScreenerToolBtn
                  active={overlay==='dust'}
                  icon={Scan}
                  label="Dust check"
                  title="High-contrast view + flagged spots (simulated)"
                  onClick={()=>setOverlay(overlay==='dust'?'none':'dust')}
                />
                <ScreenerToolBtn
                  active={overlay==='histLuma'}
                  icon={BarChart3}
                  label="Histogram"
                  title="Luminance histogram on preview"
                  onClick={()=>setOverlay(overlay==='histLuma'?'none':'histLuma')}
                />
                <ScreenerToolBtn
                  active={overlay==='histRgb'}
                  icon={LineChart}
                  label="RGB histogram"
                  title="RGB channels overlaid"
                  onClick={()=>setOverlay(overlay==='histRgb'?'none':'histRgb')}
                />
                <ScreenerToolBtn
                  active={overlay==='horizon'}
                  icon={Gauge}
                  label="Horizon"
                  title="Level guide using estimated tilt"
                  onClick={()=>setOverlay(overlay==='horizon'?'none':'horizon')}
                />
                <ScreenerToolBtn
                  active={overlay==='center'}
                  icon={Crosshair}
                  label="Center"
                  title="Center cross and focus rings"
                  onClick={()=>setOverlay(overlay==='center'?'none':'center')}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest w-full sm:w-auto sm:mr-1" style={{color:'#64748b'}}>Composition</span>
                <ScreenerToolBtn active={overlay==='none'} icon={Eye} label="Clear" title="Remove overlays" onClick={()=>setOverlay('none')} />
                <ScreenerToolBtn active={overlay==='grid'} icon={Grid3X3} label="Grid" onClick={()=>setOverlay(overlay==='grid'?'none':'grid')} />
                <ScreenerToolBtn active={overlay==='thirds'} icon={Layers} label="Thirds" onClick={()=>setOverlay(overlay==='thirds'?'none':'thirds')} />
                <ScreenerToolBtn active={overlay==='focus'} icon={ZoomIn} label="Focus zones" onClick={()=>setOverlay(overlay==='focus'?'none':'focus')} />
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="xl:col-span-5 overflow-y-auto no-scrollbar" style={{borderLeft:'1px solid #e8e8ed',maxHeight:480}}>

          {/* ── REQUIREMENTS ─────────────────────────── */}
          {tab==='requirements'&&(
            <div className="p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-widest mb-3"
                style={{color:'#94a3b8',fontSize:10,letterSpacing:'0.1em'}}>Site Acceptance Criteria</div>
              {checks.map(c=>{
                const Icon = c.pass ? (c.warn ? AlertTriangle : CheckCircle2) : XCircle;
                const color = c.pass ? (c.warn ? '#d97706' : '#16a34a') : '#dc2626';
                const bg    = c.pass ? (c.warn ? '#fffbeb' : '#f0fdf4') : '#fef2f2';
                const border= c.pass ? (c.warn ? 'rgba(217,119,6,.2)' : 'rgba(52,199,89,.2)') : 'rgba(220,38,38,.2)';
                return (
                  <div key={c.id} className="rounded-2xl p-3" style={{background:bg,border:`1px solid ${border}`}}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" style={{color}}/>
                        <span className="text-xs font-medium" style={{color:'#0f172a'}}>{c.label}</span>
                      </div>
                      <span className="text-xs font-semibold shrink-0" style={{color,fontFamily:'"SF Mono",monospace'}}>{c.value}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5 pl-6">
                      <span className="text-xs" style={{color:'#94a3b8'}}>Required: <span style={{fontFamily:'"SF Mono",monospace'}}>{c.required}</span></span>
                    </div>
                    {c.note&&<div className="mt-1.5 pl-6 text-xs" style={{color}}>{c.note}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── INSPECT ──────────────────────────────── */}
          {tab==='inspect'&&(
            <div className="p-4 space-y-5">
              <div className="rounded-xl p-3 text-xs leading-relaxed" style={{background:'#f8fafc',border:'1px solid #e8e8ed',color:'#475569'}}>
                Overlay and analysis modes are controlled from the <strong style={{color:'#0f172a'}}>tool strip under the preview</strong>. Full channel breakdowns stay on the <strong style={{color:'#0f172a'}}>Histogram</strong> tab.
              </div>
              <HorizonBubble angle={metrics.horizonAngle}/>
              <div>
                <div className="text-xs font-medium uppercase tracking-widest mb-3" style={{color:'#94a3b8',fontSize:10,letterSpacing:'0.1em'}}>Quick Metrics</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {l:'Sharpness',   v:metrics.sharpness,         unit:'/100',  ok:metrics.sharpness>=REQUIREMENTS.minSharpness},
                    {l:'Noise',       v:metrics.noiseLevel,         unit:'/100',  ok:metrics.noiseLevel<=REQUIREMENTS.maxNoise},
                    {l:'Exposure',    v:`${metrics.exposure>0?'+':''}${metrics.exposure}`, unit:' EV', ok:Math.abs(metrics.exposure)<1},
                    {l:'Colour Space',v:metrics.colorSpace,         unit:'',      ok:metrics.colorSpace==='sRGB'},
                    {l:'ISO (est.)',   v:metrics.estimatedISO,       unit:'',      ok:metrics.estimatedISO<=1600},
                    {l:'Watermark',   v:metrics.hasWatermark?'Detected':'None',unit:'',ok:!metrics.hasWatermark},
                  ].map(m=>(
                    <div key={m.l} className="rounded-xl p-3"
                      style={{background:m.ok?'#f0fdf4':'#fef2f2',border:`1px solid ${m.ok?'rgba(52,199,89,.2)':'rgba(220,38,38,.2)'}`}}>
                      <div className="text-xs mb-0.5" style={{color:'#94a3b8'}}>{m.l}</div>
                      <div className="text-base font-semibold" style={{color:m.ok?'#16a34a':'#dc2626',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>
                        {m.v}{m.unit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HISTOGRAM ────────────────────────────── */}
          {tab==='histogram'&&(
            <div className="p-4 space-y-4">
              <div className="text-xs font-medium uppercase tracking-widest" style={{color:'#94a3b8',fontSize:10,letterSpacing:'0.1em'}}>Colour Channels</div>
              <HistBar data={metrics.histogram.luma} color="#888" label="Luminance"/>
              <HistBar data={metrics.histogram.r}    color="#ff453a" label="Red"/>
              <HistBar data={metrics.histogram.g}    color="#30d158" label="Green"/>
              <HistBar data={metrics.histogram.b}    color="#0a84ff" label="Blue"/>
              {/* Exposure meter */}
              <div className="p-4 rounded-2xl" style={{background:'#f8fafc',border:'1px solid #e8e8ed'}}>
                <div className="text-xs mb-2 font-medium" style={{color:'#0f172a'}}>Exposure</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 rounded-full relative overflow-hidden"
                    style={{background:'linear-gradient(to right,#000 0%,#555 30%,#aaa 50%,#eee 70%,#fff 100%)'}}>
                    <motion.div className="absolute top-0 bottom-0 w-1 rounded-full"
                      animate={{left:`${Math.min(Math.max((metrics.exposure+3)/6*100,0),100)}%`}}
                      style={{background:'#ff3b30',transform:'translateX(-50%)'}}/>
                  </div>
                  <span className="text-sm font-semibold" style={{color:Math.abs(metrics.exposure)<.5?'#34c759':'#ff9500',fontFamily:'"SF Mono",monospace',minWidth:52,textAlign:'right'}}>
                    {metrics.exposure>0?'+':''}{metrics.exposure} EV
                  </span>
                </div>
                <div className="flex justify-between text-xs mt-1" style={{color:'#cbd5e1'}}>
                  <span>Under</span><span>Correct</span><span>Over</span>
                </div>
              </div>
              {/* Clipping */}
              <div className="grid grid-cols-2 gap-2">
                {[{l:'Highlight clip',v:metrics.clippedHighlights,max:REQUIREMENTS.maxClipHighlight},{l:'Shadow clip',v:metrics.clippedShadows,max:REQUIREMENTS.maxClipShadow}].map(c=>(
                  <div key={c.l} className="rounded-xl p-3" style={{background:c.v>c.max?'#fef2f2':'#f0fdf4',border:`1px solid ${c.v>c.max?'rgba(220,38,38,.2)':'rgba(52,199,89,.2)'}`}}>
                    <div className="text-xs mb-0.5" style={{color:'#94a3b8'}}>{c.l}</div>
                    <div className="text-base font-semibold" style={{color:c.v>c.max?'#dc2626':'#16a34a',fontFamily:'"SF Mono",monospace'}}>{c.v}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DUPLICATES ───────────────────────────── */}
          {tab==='duplicates'&&(
            <div className="p-4 space-y-4">
              <div className="text-xs font-medium uppercase tracking-widest" style={{color:'#94a3b8',fontSize:10,letterSpacing:'0.1em'}}>Perceptual Hash Comparison — {reg}</div>
              {hasDupe&&(
                <div className="flex items-start gap-2.5 p-3 rounded-xl text-xs"
                  style={{background:'#fef2f2',border:'1px solid rgba(220,38,38,.2)',color:'#dc2626'}}>
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
                  High-confidence duplicate detected — consider rejecting.
                </div>
              )}
              <div className="space-y-2">
                {dupes.map((d,i)=>{
                  const color=d.sim>90?'#dc2626':d.sim>75?'#d97706':'#16a34a';
                  return(
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{background:'#f8fafc',border:'1px solid #e8e8ed'}}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center font-semibold text-xs"
                        style={{background:'#0f172a',color:'#fff',fontFamily:'"SF Mono",monospace'}}>{d.reg.slice(0,2)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{color:'#0f172a'}}>{d.reg}</div>
                        <div className="text-xs" style={{color:'#94a3b8'}}>{d.date} · {d.spotter}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold" style={{color,fontFamily:'"SF Mono",monospace'}}>{d.sim}%</div>
                        <div className="text-xs" style={{color:'#94a3b8'}}>match</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 rounded-2xl" style={{background:'#f8fafc'}}>
                {[{r:'>90%',l:'Exact duplicate — reject',c:'#dc2626'},{r:'75–90%',l:'Similar shot — review',c:'#d97706'},{r:'<75%',l:'Different photo — ok',c:'#34c759'}].map(t=>(
                  <div key={t.r} className="flex items-center gap-2.5 text-xs py-1.5" style={{borderBottom:'1px solid #e8e8ed'}}>
                    <div className="w-2 h-2 rounded-full" style={{background:t.c}}/>
                    <span style={{color:'#0f172a',minWidth:52,fontFamily:'"SF Mono",monospace',fontWeight:500}}>{t.r}</span>
                    <span style={{color:'#475569'}}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
