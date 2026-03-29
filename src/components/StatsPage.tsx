import { motion } from 'motion/react';
import { TrendingUp, Camera, Eye, Heart, Plane, MapPin, Globe2, Award, Zap, BarChart3, Users, Star, ArrowUp, ArrowDown, Activity } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

type Tab = 'Overview'|'Spotters'|'Aircraft'|'Airports';

const globalStats = [
  {label:'Total Photos',     value:'0',     delta:'', up:true,  icon:Camera,   color:'#0ea5e9'},
  {label:'Aircraft in DB',   value:'0',     delta:'', up:true,  icon:Plane,    color:'#34c759'},
  {label:'Active Spotters',  value:'0',     delta:'', up:true,  icon:Users,    color:'#ff9500'},
  {label:'Airports Covered', value:'0',     delta:'', up:true,  icon:MapPin,   color:'#5e5ce6'},
  {label:'Monthly Views',    value:'0',     delta:'', up:true,  icon:Eye,      color:'#94a3b8'},
  {label:'Avg Quality Score',value:'—',     delta:'', up:true,  icon:Star,     color:'#ff3b30'},
];

const topSpotters = [
  {rank:1, name:'Marcus Webb',   country:'🇬🇧', uploads:5284, views:'2.1M', rank_label:'Legend',  trend: 0},
  {rank:2, name:'Yuki Tanaka',   country:'🇯🇵', uploads:3190, views:'1.4M', rank_label:'Master',  trend: 1},
  {rank:3, name:'Aziz Karimov',  country:'🇺🇿', uploads:1847, views:'847K', rank_label:'Expert',  trend:-1},
  {rank:4, name:'Clara Schmidt', country:'🇩🇪', uploads:1203, views:'521K', rank_label:'Expert',  trend: 2},
  {rank:5, name:'Sam Okonkwo',   country:'🇳🇬', uploads:847,  views:'312K', rank_label:'Senior',  trend:-1},
  {rank:6, name:'Priya Sharma',  country:'🇮🇳', uploads:734,  views:'287K', rank_label:'Senior',  trend: 3},
  {rank:7, name:'Tom Fischer',   country:'🇦🇹', uploads:691,  views:'248K', rank_label:'Senior',  trend: 0},
  {rank:8, name:'Luis Mendez',   country:'🇲🇽', uploads:584,  views:'201K', rank_label:'Spotter', trend: 1},
];

const rareAircraft = [
  {reg:'UR-82060', type:'Antonov An-124-100',  operator:'Antonov Airlines', country:'🇺🇦', photos:12},
  {reg:'VQ-BWT',   type:'Boeing 737-700 BBJ',  operator:'Private',          country:'🇷🇺', photos:8 },
  {reg:'JA8089',   type:'Boeing 747-200F',      operator:'Nippon Cargo',     country:'🇯🇵', photos:6 },
  {reg:'EP-AGA',   type:'Boeing 747SP',         operator:'Iran Air',         country:'🇮🇷', photos:4 },
];

const topAirports = [
  {iata:'DXB', name:'Dubai International',     country:'🇦🇪', photos:28420, spotters:847},
  {iata:'LHR', name:'London Heathrow',          country:'🇬🇧', photos:24180, spotters:721},
  {iata:'CDG', name:'Paris Charles de Gaulle', country:'🇫🇷', photos:19840, spotters:612},
  {iata:'FRA', name:'Frankfurt Airport',        country:'🇩🇪', photos:17320, spotters:541},
  {iata:'AMS', name:'Amsterdam Schiphol',       country:'🇳🇱', photos:15910, spotters:498},
  {iata:'SIN', name:'Singapore Changi',         country:'🇸🇬', photos:14780, spotters:467},
];

const weeklyUploads = [42,58,71,49,84,93,67,78,55,102,88,74,91,110];
const maxW = Math.max(...weeklyUploads);

const typeBreakdown = [
  {type:'Narrow-body',  pct:57, color:'#0ea5e9'},
  {type:'Wide-body',    pct:30, color:'#34c759'},
  {type:'Regional jet', pct:10, color:'#ff9500'},
  {type:'Turboprop',    pct:2,  color:'#5e5ce6'},
  {type:'Military',     pct:1,  color:'#ff3b30'},
];

const TrendIcon = ({t}:{t:number}) => t>0?<div className="flex items-center gap-0.5 text-xs" style={{color:'#34c759'}}><ArrowUp className="w-3 h-3"/>+{t}</div>:t<0?<div className="flex items-center gap-0.5 text-xs" style={{color:'#ff3b30'}}><ArrowDown className="w-3 h-3"/>{t}</div>:<div className="text-xs" style={{color:'#e2e8f0'}}>—</div>;

const TABS: Tab[] = ['Overview','Spotters','Aircraft','Airports'];

export const StatsPage = () => {
  const [tab, setTab] = useState<Tab>('Overview');

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{background:'#fff',minHeight:'100vh'}}>

      {/* Header */}
      <section style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div className="max-w-screen-xl mx-auto px-8 py-10">
          <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Analytics</div>
          <h1 className="font-headline text-4xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Platform Statistics</h1>
          <p className="text-sm mt-1" style={{color:'#475569'}}>Real-time data across the entire SkyGrid Pro community.</p>
        </div>
        <div className="max-w-screen-xl mx-auto px-8 flex">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className="text-sm px-6 py-4 transition-all"
              style={{color:tab===t?'#0f172a':'#475569',borderBottom:tab===t?'2px solid #0f172a':'2px solid transparent',fontWeight:tab===t?500:400,background:'transparent'}}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-8 py-10">

        {/* OVERVIEW */}
        {tab==='Overview'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {globalStats.map((s,i)=>{const Icon=s.icon;return(
                <motion.div key={s.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}} className="card p-5">
                  <Icon className="w-4 h-4 mb-3" style={{color:s.color}}/>
                  <div className="text-xl font-semibold mb-1 tracking-tight" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{s.value}</div>
                  <div className="text-xs mb-2" style={{color:'#94a3b8'}}>{s.label}</div>
                  <div className="flex items-center gap-1 text-xs" style={{color:s.up?'#34c759':'#ff3b30',fontFamily:'"SF Mono",monospace'}}>
                    {s.up?<ArrowUp className="w-3 h-3"/>:<ArrowDown className="w-3 h-3"/>}{s.delta}
                  </div>
                </motion.div>
              );})}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Bar chart */}
              <div className="xl:col-span-8 card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-semibold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Daily Uploads — Last 14 Days</h3>
                  <div className="flex items-center gap-1.5 text-xs" style={{color:'#34c759'}}><Activity className="w-3.5 h-3.5"/>Live</div>
                </div>
                <div className="flex items-end gap-2" style={{height:140}}>
                  {weeklyUploads.map((v,i)=>(
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <motion.div initial={{height:0}} animate={{height:`${(v/maxW)*100}%`}} transition={{delay:i*0.03,duration:0.5}}
                        className="w-full rounded-t-sm" style={{background:v===maxW?'#0f172a':'#f1f5f9',minHeight:4}}/>
                      <span className="text-xs" style={{color:'#e2e8f0',fontFamily:'"SF Mono",monospace',fontSize:10}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Breakdown */}
              <div className="xl:col-span-4 card p-6">
                <h3 className="text-base font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>By Aircraft Class</h3>
                <div className="space-y-3">
                  {typeBreakdown.map((t,i)=>(
                    <div key={t.type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm" style={{color:'#0f172a'}}>{t.type}</span>
                        <span className="text-sm font-medium" style={{color:t.color,fontFamily:'"SF Mono",monospace'}}>{t.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{background:'#f8fafc'}}>
                        <motion.div className="h-1.5 rounded-full" initial={{width:0}} animate={{width:`${t.pct}%`}} transition={{delay:i*0.08+0.3,duration:0.6}} style={{background:t.color}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-base font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Fewest Photos — Rarest Aircraft</h3>
                {rareAircraft.map((ac,i)=>(
                  <div key={ac.reg} className="flex items-center gap-4 py-3" style={{borderBottom:i<rareAircraft.length-1?'1px solid #f5f5f7':'none'}}>
                    <span style={{fontSize:18}}>{ac.country}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{ac.reg}</div>
                      <div className="text-xs truncate" style={{color:'#94a3b8'}}>{ac.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold" style={{color:'#ff9500',fontFamily:'"SF Mono",monospace'}}>{ac.photos}</div>
                      <div className="text-xs" style={{color:'#94a3b8'}}>photos</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="card p-6">
                <h3 className="text-base font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Top Airports by Photos</h3>
                {topAirports.slice(0,5).map((ap,i)=>(
                  <div key={ap.iata} className="flex items-center gap-3 py-3" style={{borderBottom:i<4?'1px solid #f5f5f7':'none'}}>
                    <span className="text-xs w-4 text-right" style={{color:'#e2e8f0',fontFamily:'"SF Mono",monospace'}}>{i+1}</span>
                    <span style={{fontSize:16}}>{ap.country}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="tag">{ap.iata}</span>
                      <span className="text-sm truncate" style={{color:'#475569'}}>{ap.name}</span>
                    </div>
                    <span className="text-sm font-medium" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{ap.photos.toLocaleString('en-US')}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* SPOTTERS */}
        {tab==='Spotters'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[topSpotters[1],topSpotters[0],topSpotters[2]].map((s,idx)=>{
                const isFirst=s.rank===1;
                return(
                  <motion.div key={s.name} initial={{opacity:0,y:16}} animate={{opacity:1,y:isFirst?0:10}} transition={{delay:idx*0.1}}
                    className="card p-6 text-center" style={{border:isFirst?'1px solid #e2e8f0':'1px solid #f5f5f7'}}>
                    <div className="text-2xl mb-1">{s.country}</div>
                    <div className="text-3xl font-bold mb-2 tracking-tight" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>#{s.rank}</div>
                    <div className="font-semibold mb-1 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{s.name}</div>
                    <div className="text-xs mb-3" style={{color:'#94a3b8'}}>{s.rank_label}</div>
                    <div className="text-xl font-semibold" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{s.uploads.toLocaleString('en-US')}</div>
                    <div className="text-xs" style={{color:'#94a3b8'}}>photos</div>
                  </motion.div>
                );
              })}
            </div>
            <div className="card overflow-hidden">
              <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-wide"
                style={{gridTemplateColumns:'40px 40px 1fr 80px 100px 90px 60px',background:'#f8fafc',borderBottom:'1px solid #f5f5f7',color:'#94a3b8',letterSpacing:'0.05em'}}>
                <div>#</div><div/><div>Spotter</div><div>Level</div><div>Photos</div><div>Views</div><div>Trend</div>
              </div>
              {topSpotters.map((s,i)=>(
                <motion.div key={s.rank} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                  className="grid items-center px-6 py-4 cursor-pointer transition-colors"
                  style={{gridTemplateColumns:'40px 40px 1fr 80px 100px 90px 60px',borderBottom:'1px solid #f5f5f7'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <div className="text-sm font-medium" style={{color:s.rank<=3?'#ff9500':'#94a3b8',fontFamily:'"SF Mono",monospace'}}>#{s.rank}</div>
                  <div style={{fontSize:20}}>{s.country}</div>
                  <div className="font-medium tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{s.name}</div>
                  <div><span className="tag-accent">{s.rank_label}</span></div>
                  <div className="font-medium" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{s.uploads.toLocaleString('en-US')}</div>
                  <div style={{color:'#475569',fontFamily:'"SF Mono",monospace'}}>{s.views}</div>
                  <TrendIcon t={s.trend}/>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AIRCRAFT */}
        {tab==='Aircraft'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-base font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Most Photographed Types</h3>
              {[{type:'Boeing 737-800',photos:98420,pct:82},{type:'Airbus A320-200',photos:87310,pct:73},{type:'Boeing 737 MAX 8',photos:74180,pct:62},{type:'Airbus A321',photos:61240,pct:51},{type:'Boeing 787-9',photos:54870,pct:46}].map((t,i)=>(
                <div key={t.type} className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium" style={{color:'#0f172a'}}>{t.type}</span>
                    <span className="text-sm" style={{color:'#0ea5e9',fontFamily:'"SF Mono",monospace'}}>{t.photos.toLocaleString('en-US')}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{background:'#f8fafc'}}>
                    <motion.div className="h-1.5 rounded-full" initial={{width:0}} animate={{width:`${t.pct}%`}} transition={{delay:i*0.07+0.2,duration:0.5}} style={{background:'#0f172a'}}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="card p-6">
              <h3 className="text-base font-semibold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Rarest — Fewest Photos</h3>
              {rareAircraft.map((ac,i)=>(
                <div key={ac.reg} className="flex items-center gap-4 py-3" style={{borderBottom:i<rareAircraft.length-1?'1px solid #f5f5f7':'none'}}>
                  <span style={{fontSize:18}}>{ac.country}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{ac.reg}</div>
                    <div className="text-xs truncate" style={{color:'#94a3b8'}}>{ac.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold" style={{color:'#ff9500',fontFamily:'"SF Mono",monospace'}}>{ac.photos}</div>
                    <div className="text-xs" style={{color:'#94a3b8'}}>photos</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* AIRPORTS */}
        {tab==='Airports'&&(
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}>
            <div className="card overflow-hidden">
              <div className="grid px-6 py-3 text-xs font-medium uppercase tracking-wide"
                style={{gridTemplateColumns:'40px 60px 1fr 120px 110px',background:'#f8fafc',borderBottom:'1px solid #f5f5f7',color:'#94a3b8',letterSpacing:'0.05em'}}>
                <div>#</div><div>IATA</div><div>Airport</div><div>Photos</div><div>Spotters</div>
              </div>
              {topAirports.map((ap,i)=>(
                <motion.div key={ap.iata} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                  className="grid items-center px-6 py-4 cursor-pointer transition-colors"
                  style={{gridTemplateColumns:'40px 60px 1fr 120px 110px',borderBottom:'1px solid #f5f5f7'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <div className="text-sm" style={{color:'#e2e8f0',fontFamily:'"SF Mono",monospace'}}>{i+1}</div>
                  <div className="flex items-center gap-2"><span style={{fontSize:16}}>{ap.country}</span><span className="tag">{ap.iata}</span></div>
                  <div className="font-medium text-sm tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{ap.name}</div>
                  <div className="font-medium text-sm" style={{color:'#0ea5e9',fontFamily:'"SF Mono",monospace'}}>{ap.photos.toLocaleString('en-US')}</div>
                  <div className="text-sm" style={{color:'#475569',fontFamily:'"SF Mono",monospace'}}>{ap.spotters.toLocaleString('en-US')}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
