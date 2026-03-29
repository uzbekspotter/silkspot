import { motion } from 'motion/react';
import { MessageSquare, Flame, Pin, Eye, Heart, ChevronRight, Search, X, Users, BarChart3, Globe2, BookOpen, Zap, TrendingUp, Camera } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

const CATEGORIES = [
  {id:'all',    label:'All Topics',       icon:Globe2,       count:1284, color:'#94a3b8'},
  {id:'news',   label:'Aviation News',    icon:Globe2,       count:342,  color:'#0ea5e9'},
  {id:'id',     label:'Aircraft ID Help', icon:Camera,       count:187,  color:'#34c759'},
  {id:'spots',  label:'Spotting Reports', icon:Camera,       count:421,  color:'#ff9500'},
  {id:'tech',   label:'Tech & Equipment', icon:Zap,          count:156,  color:'#5e5ce6'},
  {id:'rare',   label:'Rare Catches',     icon:Flame,        count:98,   color:'#ff3b30'},
  {id:'general',label:'General',          icon:MessageSquare,count:280,  color:'#94a3b8'},
];

const THREADS = [
  {id:'t1', cat:'news',    catLabel:'Aviation News',   title:'Lufthansa takes delivery of first A350-1000 in new livery',                   excerpt:'The aircraft landed at FRA this morning after a delivery flight from TLS. Initial photos show the updated tail design...',  author:'Marcus Webb',   country:'🇬🇧', rank:'Legend',  time:'2h',  replies:34, views:'2.4K', likes:87,  pinned:false, hot:true  },
  {id:'t2', cat:'id',      catLabel:'Aircraft ID Help',title:'Help identifying this An-124 registration — spotted at TAS last Thursday',    excerpt:'I have photos of an Antonov An-124 that landed at Tashkent with partial tail number visible. Can anyone confirm the full reg?', author:'Aziz Karimov',  country:'🇺🇿', rank:'Expert', time:'4h',  replies:12, views:'847',  likes:23,  pinned:false, hot:false },
  {id:'t3', cat:'rare',    catLabel:'Rare Catches',    title:'USAF E-4B "Nightwatch" diverted to CDG — full photo set inside',              excerpt:'Once in a decade catch at Paris Charles de Gaulle. The aircraft was diverted due to weather. All 14 photos now in DB...',    author:'Jean Dupont',   country:'🇫🇷', rank:'Senior', time:'6h',  replies:67, views:'8.1K', likes:312, pinned:false, hot:true  },
  {id:'t4', cat:'spots',   catLabel:'Spotting Reports',title:'Best positions at IST new airport — comprehensive guide with GPS coords',       excerpt:'After three visits I have mapped out 8 reliable spotting locations at the new Istanbul Airport. Includes runway 35L approach spots...',author:'Yuki Tanaka',   country:'🇯🇵', rank:'Master', time:'1d',  replies:28, views:'3.2K', likes:145, pinned:true,  hot:false },
  {id:'t5', cat:'tech',    catLabel:'Tech & Equipment','title':'Canon R5 vs Sony A1 for aviation — 2025 comparison',                         excerpt:'I have shot extensively with both bodies at DXB and LHR over the past 6 months. The AF performance difference in burst mode is significant...',author:'Clara Schmidt', country:'🇩🇪', rank:'Expert', time:'2d',  replies:91, views:'12.4K',likes:234, pinned:true,  hot:false },
  {id:'t6', cat:'news',    catLabel:'Aviation News',   title:'Air India retires last 747 — era ends at Mumbai',                              excerpt:'VT-EVA made its final revenue flight this week. A small group of spotters were present for the occasion at BOM...',           author:'Priya Sharma',  country:'🇮🇳', rank:'Senior', time:'3d',  replies:44, views:'5.8K', likes:189, pinned:false, hot:false },
];

const TRENDING = ['Antonov An-124','A350-1000','IST new terminal','Air India 747 retirement','E-4B Nightwatch','Canon R5 aviation'];

export const CommunityPage = () => {
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch]       = useState('');

  const filtered = THREADS.filter(t => {
    if(activeCat!=='all'&&t.cat!==activeCat) return false;
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase())&&!t.author.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{background:'#fff',minHeight:'100vh'}}>

      {/* Header */}
      <section style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div className="max-w-screen-xl mx-auto px-8 py-10 flex items-end justify-between flex-wrap gap-6">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide mb-2" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Community</div>
            <h1 className="font-headline text-4xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Forums</h1>
            <p className="text-sm mt-1" style={{color:'#475569'}}>Discuss aviation, share sightings and get help from the community.</p>
          </div>
          <button className="btn-primary" style={{height:40,padding:'0 20px',fontSize:13,gap:6}}>
            <MessageSquare className="w-3.5 h-3.5"/>New Thread
          </button>
        </div>
      </section>

      <div className="max-w-screen-xl mx-auto px-8 py-10 grid grid-cols-1 xl:grid-cols-12 gap-8">

        {/* Main */}
        <div className="xl:col-span-8 space-y-5">

          {/* Category pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map(c=>{const Icon=c.icon;return(
              <button key={c.id} onClick={()=>setActiveCat(c.id)}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-full transition-all"
                style={{background:activeCat===c.id?'#0f172a':'transparent',color:activeCat===c.id?'#fff':'#475569',border:activeCat===c.id?'none':'1px solid #e8e8ed',fontWeight:activeCat===c.id?500:400}}>
                <Icon className="w-3.5 h-3.5"/>
                {c.label}
                <span className="text-xs" style={{fontFamily:'"SF Mono",monospace',opacity:0.6}}>{c.count}</span>
              </button>
            );})}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{color:'#94a3b8'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search threads…" style={{paddingLeft:44}}/>
            {search&&<X className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 cursor-pointer" style={{color:'#94a3b8'}} onClick={()=>setSearch('')}/>}
          </div>

          {/* Threads */}
          {filtered.length===0?(
            <div className="text-center py-16" style={{color:'#94a3b8'}}>
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20"/>
              <div className="text-sm font-medium">No threads found</div>
            </div>
          ):filtered.map((thread,i)=>(
            <motion.div key={thread.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
              className="card p-6 cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {thread.pinned&&<div className="flex items-center gap-1 text-xs font-medium" style={{color:'#475569'}}><Pin className="w-3 h-3"/>Pinned</div>}
                    {thread.hot&&<div className="flex items-center gap-1 text-xs font-medium" style={{color:'#ff3b30'}}><Flame className="w-3 h-3"/>Hot</div>}
                    <span className="tag-accent">{thread.catLabel}</span>
                  </div>
                  <h3 className="font-semibold text-base mb-2 tracking-tight group-hover:text-blue-600 transition-colors" style={{color:'#0f172a',letterSpacing:'-0.01em',lineHeight:1.3}}>
                    {thread.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-4 line-clamp-2" style={{color:'#475569'}}>{thread.excerpt}</p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold" style={{background:'#0f172a',color:'#fff',fontSize:9}}>{thread.author[0]}</div>
                      <span className="text-xs font-medium" style={{color:'#0f172a'}}>{thread.author}</span>
                      <span style={{fontSize:14}}>{thread.country}</span>
                      <span className="tag-accent text-xs">{thread.rank}</span>
                      <span className="text-xs" style={{color:'#94a3b8'}}>{thread.time}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>
                      <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3"/>{thread.replies}</span>
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{thread.views}</span>
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{thread.likes}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5" style={{color:'#e2e8f0'}}/>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="xl:col-span-4 space-y-5">

          {/* Forum stats */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Forum Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {[{label:'Threads',val:'4,847',icon:MessageSquare},{label:'Posts',val:'31.2K',icon:BarChart3},{label:'Members',val:'18.4K',icon:Users},{label:'Online',val:'284',icon:Globe2}].map(s=>{const Icon=s.icon;return(
                <div key={s.label} className="card-gray p-3 rounded-xl">
                  <Icon className="w-3.5 h-3.5 mb-2" style={{color:'#94a3b8'}}/>
                  <div className="text-base font-semibold tracking-tight" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{s.val}</div>
                  <div className="text-xs" style={{color:'#94a3b8'}}>{s.label}</div>
                </div>
              );})}
            </div>
          </div>

          {/* Active members */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Active Now</h3>
            <div className="space-y-3">
              {[{name:'Marcus Webb',country:'🇬🇧',rank:'Legend'},{name:'Yuki Tanaka',country:'🇯🇵',rank:'Master'},{name:'Clara Schmidt',country:'🇩🇪',rank:'Expert'},{name:'Aziz Karimov',country:'🇺🇿',rank:'Expert'}].map(m=>(
                <div key={m.name} className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{background:'#0f172a',color:'#fff',fontSize:10}}>{m.name[0]}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{background:'#34c759'}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{color:'#0f172a'}}>{m.name} {m.country}</div>
                    <div className="text-xs" style={{color:'#94a3b8'}}>{m.rank}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending topics */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-4 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Trending Topics</h3>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map(t=>(
                <button key={t} className="tag cursor-pointer transition-colors"
                  style={{color:'#475569'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#f1f5f9'}
                  onMouseLeave={e=>e.currentTarget.style.background='#f8fafc'}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
