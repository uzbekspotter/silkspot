import { motion, AnimatePresence } from 'motion/react';
import { Camera, Eye, Heart, Plane, MapPin, Calendar, Award, Sparkles, Moon, Zap, Star, Globe2, UserPlus, MessageSquare, Settings, CheckCircle2, BarChart3, Clock, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';

type Tab = 'Photos' | 'Stats' | 'Achievements';

const coreStats = [
  {label:'Photos',         value:'0',  icon:Camera, mono:true },
  {label:'Views',          value:'0',  icon:Eye,    mono:true },
  {label:'Likes',          value:'0',  icon:Heart,  mono:true },
  {label:'Aircraft Types', value:'0',  icon:Plane,  mono:true },
  {label:'Airports',       value:'0',  icon:MapPin, mono:true },
  {label:'Countries',      value:'0',  icon:Globe2, mono:true },
];

// Photos loaded from Supabase
const photos: any[] = [];

const achievements = [
  {icon:Award,    bg:'#fef3c7',color:'#d97706',label:'1K Club',       sub:'1,000+ approved photos',         unlocked:true },
  {icon:Sparkles, bg:'#dbeafe',color:'#2563eb',label:'Rare Catch',    sub:'First to photograph An-225 in DB',unlocked:true },
  {icon:Moon,     bg:'#ede9fe',color:'#7c3aed',label:'Night Owl',     sub:'100+ night photography shots',    unlocked:true },
  {icon:Zap,      bg:'#dcfce7',color:'#16a34a',label:'Daily Streak',  sub:'30 consecutive active days',      unlocked:true },
  {icon:Globe2,   bg:'#fef3c7',color:'#d97706',label:'Globe Trotter', sub:'Photos from 10+ countries',       unlocked:true },
  {icon:Star,     bg:'#f8fafc',color:'#94a3b8',label:'Legend',        sub:'5,000 photos required',           unlocked:false},
  {icon:Award,    bg:'#f8fafc',color:'#94a3b8',label:'Top 10',        sub:'Reach top-10 globally',           unlocked:false},
  {icon:Camera,   bg:'#f8fafc',color:'#94a3b8',label:'Verified',      sub:'Manual verification needed',      unlocked:false},
];

const topAirlines = [
  {name:'Uzbekistan Airways',iata:'HY',count:312,pct:17},
  {name:'Emirates',          iata:'EK',count:247,pct:13},
  {name:'Turkish Airlines',  iata:'TK',count:198,pct:11},
  {name:'Aeroflot',          iata:'SU',count:176,pct:10},
];

const monthly = [18,24,31,19,42,55,38,61,49,73,58,84];
const maxM = Math.max(...monthly);
const RANKS = ['Observer','Reporter','Contributor','Spotter','Senior','Expert','Master','Legend'];

export const ProfilePage = () => {
  const [tab, setTab] = useState<Tab>('Photos');
  const [following, setFollowing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAirport, setEditAirport] = useState('');
  const TABS: Tab[] = ['Photos','Stats','Achievements'];

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) {
        console.log('No user logged in');
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setEditName(data.display_name || '');
      setEditBio(data.bio || '');
      setEditLocation(data.location || '');
      setEditAirport(''); // TODO: load from airports table
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({
          display_name: editName,
          bio: editBio,
          location: editLocation,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        display_name: editName,
        bio: editBio,
        location: editLocation,
      });

      setEditOpen(false);
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4" 
            style={{borderColor:'#e2e8f0',borderTopColor:'transparent'}}/>
          <p style={{color:'#94a3b8'}}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{color:'#94a3b8'}}>Profile not found</p>
      </div>
    );
  }

  const spotter = {
    name: profile.display_name || profile.username,
    username: '@' + profile.username,
    avatar: (profile.display_name || profile.username).substring(0, 2).toUpperCase(),
    location: profile.location || 'Unknown',
    homeAirport: profile.home_airport_id || 'N/A',
    joinedDate: new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    rank: profile.rank || 'Observer',
    bio: profile.bio || '',
    coverUrl: profile.cover_url || '',
    isOwn: true,
    followers: profile.follower_count || 0,
    following: profile.following_count || 0,
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{background:'#fff',minHeight:'100vh'}}>

      {/* Cover */}
      <section className="relative">
        <div className="relative overflow-hidden" style={{height:240}}>
          <img src={spotter.coverUrl} className="w-full h-full object-cover" style={{opacity:0.5}} referrerPolicy="no-referrer"/>
          <div className="absolute inset-0" style={{background:'linear-gradient(to bottom,transparent 40%,#fff 100%)'}}/>
        </div>

        <div className="max-w-screen-xl mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5 -mt-14 relative z-10 pb-8" style={{borderBottom:'1px solid #f5f5f7'}}>
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-3xl shrink-0"
              style={{background:'#0f172a',color:'#fff',border:'4px solid #fff',boxShadow:'0 2px 12px rgba(0,0,0,0.12)',letterSpacing:'-0.02em'}}>
              {spotter.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="font-headline text-3xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>{spotter.name}</h1>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{background:'#f8fafc',color:'#475569'}}>{spotter.rank}</span>
              </div>
              <div className="text-sm mb-2" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{spotter.username}</div>
              <div className="flex flex-wrap items-center gap-4 text-sm" style={{color:'#475569'}}>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/>{spotter.location}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/>Joined {spotter.joinedDate}</span>
              </div>
              {spotter.bio&&<p className="text-sm mt-2" style={{color:'#475569',maxWidth:480,lineHeight:1.5}}>{spotter.bio}</p>}
            </div>
            <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
              <div className="flex items-center gap-6">
                {[{val:spotter.followers.toLocaleString('en-US'),label:'Followers'},{val:spotter.following.toLocaleString('en-US'),label:'Following'}].map(s=>(
                  <div key={s.label} className="text-center cursor-pointer">
                    <div className="text-base font-semibold" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{s.val}</div>
                    <div className="text-xs" style={{color:'#94a3b8'}}>{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {spotter.isOwn?(
                  <button onClick={() => setEditOpen(true)} className="btn-outline" style={{height:34,padding:'0 16px',fontSize:12,gap:6}}><Settings className="w-3.5 h-3.5"/>Edit Profile</button>
                ):(
                  <>
                    <button onClick={()=>setFollowing(f=>!f)}
                      className={following?'btn-outline':'btn-primary'}
                      style={{height:34,padding:'0 16px',fontSize:12,gap:6}}>
                      <UserPlus className="w-3.5 h-3.5"/>{following?'Following':'Follow'}
                    </button>
                    <button className="btn-outline" style={{height:34,padding:'0 16px',fontSize:12,gap:6}}><MessageSquare className="w-3.5 h-3.5"/>Message</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <div style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
        <div className="max-w-screen-xl mx-auto px-8">
          <div className="flex items-stretch overflow-x-auto no-scrollbar">
            {coreStats.map((s,i)=>{const Icon=s.icon;return(
              <div key={s.label} className="flex items-center gap-2.5 px-7 py-4 shrink-0"
                style={{borderRight:i<coreStats.length-1?'1px solid #e8e8ed':'none'}}>
                <Icon className="w-3.5 h-3.5" style={{color:'#94a3b8'}}/>
                <span className="text-sm font-semibold mr-1" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace'}}>{s.value}</span>
                <span className="text-xs" style={{color:'#94a3b8'}}>{s.label}</span>
              </div>
            );})}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:'#fff',borderBottom:'1px solid #e2e8f0',position:'sticky',top:52,zIndex:40}}>
        <div className="max-w-screen-xl mx-auto px-8 flex">
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className="text-sm px-6 py-4 transition-all"
              style={{color:tab===t?'#0f172a':'#475569',borderBottom:tab===t?'2px solid #0f172a':'2px solid transparent',fontWeight:tab===t?500:400}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-8 py-10">
        <AnimatePresence mode="wait">

          {/* PHOTOS */}
          {tab==='Photos'&&(
            <motion.div key="photos" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {['All','Featured','Takeoff','Landing','Static','Night'].map(f=>(
                    <button key={f} className="btn-outline" style={{height:32,padding:'0 14px',fontSize:12}}>{f}</button>
                  ))}
                </div>
                <span className="text-sm" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>1,847 photos</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {photos.map((p,i)=>(
                  <motion.div key={p.id} initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
                    className={`card cursor-pointer group overflow-hidden ${i===0?'md:col-span-2':''}`}>
                    <div className={`relative overflow-hidden ${i===0?'aspect-[16/9]':'aspect-[4/3]'}`} style={{borderRadius:'18px 18px 0 0'}}>
                      <img src={p.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" referrerPolicy="no-referrer"/>
                      <div className="photo-overlay absolute inset-0"/>
                      {p.featured&&<div className="absolute top-3 left-3"><span className="text-xs px-2 py-1 rounded-full font-medium" style={{background:'rgba(255,255,255,0.9)',color:'#d97706'}}>⭐ Featured</span></div>}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <div className="text-sm font-semibold mb-0.5" style={{color:'#fff'}}>{p.reg}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{color:'rgba(255,255,255,0.6)'}}>{p.operator} · <span className="tag" style={{background:'rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.8)',border:'none'}}>{p.airport}</span></span>
                          <div className="flex items-center gap-3 text-xs" style={{color:'rgba(255,255,255,0.5)',fontFamily:'"SF Mono",monospace'}}>
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3"/>{p.views.toLocaleString('en-US')}</span>
                            <span className="flex items-center gap-1"><Heart className="w-3 h-3"/>{p.likes}</span>
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

          {/* STATS */}
          {tab==='Stats'&&(
            <motion.div key="stats" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-7 space-y-6">
                {/* Activity chart */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-6" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Monthly Uploads — Last 12 months</h3>
                  <div className="flex items-end gap-2" style={{height:120}}>
                    {monthly.map((v,i)=>(
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                        <motion.div initial={{height:0}} animate={{height:`${(v/maxM)*100}%`}} transition={{delay:i*0.03,duration:0.5}}
                          className="w-full rounded-t-sm" style={{background:v===maxM?'#0f172a':'#f1f5f9',minHeight:4}}/>
                        <span className="text-xs" style={{color:'#e2e8f0',fontFamily:'"SF Mono",monospace',fontSize:10}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Top airlines */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold mb-5" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Top Airlines</h3>
                  <div className="space-y-4">
                    {topAirlines.map((a,i)=>(
                      <div key={a.iata}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="tag">{a.iata}</span>
                            <span className="text-sm" style={{color:'#0f172a'}}>{a.name}</span>
                          </div>
                          <span className="text-sm" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>{a.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{background:'#f8fafc'}}>
                          <motion.div className="h-1.5 rounded-full" initial={{width:0}} animate={{width:`${a.pct}%`}} transition={{delay:i*0.07+0.2,duration:0.5}} style={{background:'#0f172a'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="xl:col-span-5 space-y-6">
                {/* Rank progress */}
                <div className="card-gray p-6 rounded-2xl">
                  <h3 className="text-sm font-semibold mb-5" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Rank Progress</h3>
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:'#fff',boxShadow:'0 1px 4px rgba(0,0,0,0.08)'}}>
                      <Award className="w-6 h-6" style={{color:'#0f172a'}}/>
                    </div>
                    <div>
                      <div className="font-semibold" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Expert</div>
                      <div className="text-xs" style={{color:'#94a3b8'}}>Level 6 of 8</div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    {RANKS.map((r,i)=>{const cur=i===5,done=i<5;return(
                      <div key={r} className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0"
                          style={{background:cur?'#0f172a':done?'#e2e8f0':'#f8fafc',border:`1.5px solid ${cur?'#0f172a':done?'#e2e8f0':'#f1f5f9'}`}}>
                          {done&&<CheckCircle2 className="w-2 h-2 text-white"/>}
                        </div>
                        <span className="text-xs" style={{color:cur?'#0f172a':done?'#94a3b8':'#e2e8f0',fontWeight:cur?500:400}}>{r}</span>
                        {cur&&<span className="ml-auto text-xs" style={{color:'#94a3b8',fontFamily:'"SF Mono",monospace'}}>you</span>}
                      </div>
                    );})}
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5" style={{color:'#94a3b8'}}>
                      <span>To Master Spotter</span>
                      <span style={{fontFamily:'"SF Mono",monospace'}}>1,847 / 2,500</span>
                    </div>
                    <div className="h-2 rounded-full" style={{background:'#f1f5f9'}}>
                      <div className="h-2 rounded-full" style={{width:'74%',background:'#0f172a'}}/>
                    </div>
                  </div>
                </div>
                {/* Quick vitals */}
                <div className="grid grid-cols-2 gap-3">
                  {[{label:'Best month',val:'84',sub:'Mar 2025'},{label:'Avg/month',val:'46',sub:'over 12mo'},{label:'Approval',val:'94%',sub:'all-time'},{label:'Avg score',val:'87',sub:'metadata'}].map(v=>(
                    <div key={v.label} className="card p-4">
                      <div className="text-xs mb-1" style={{color:'#94a3b8'}}>{v.label}</div>
                      <div className="text-xl font-semibold" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{v.val}</div>
                      <div className="text-xs mt-0.5" style={{color:'#e2e8f0'}}>{v.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ACHIEVEMENTS */}
          {tab==='Achievements'&&(
            <motion.div key="ach" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-headline text-2xl font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>Achievements</h2>
                <span className="text-sm" style={{color:'#94a3b8'}}>{achievements.filter(a=>a.unlocked).length} of {achievements.length} unlocked</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {achievements.map((ach,i)=>{const Icon=ach.icon;return(
                  <motion.div key={ach.label} initial={{opacity:0,scale:0.96}} animate={{opacity:1,scale:1}} transition={{delay:i*0.05}}
                    className="card p-5" style={{opacity:ach.unlocked?1:0.5}}>
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                      style={{background:ach.bg}}>
                      <Icon className="w-5 h-5" style={{color:ach.color}}/>
                    </div>
                    <div className="font-semibold mb-1 text-sm" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>{ach.label}</div>
                    <div className="text-xs leading-relaxed mb-3" style={{color:'#94a3b8'}}>{ach.sub}</div>
                    {ach.unlocked&&<div className="flex items-center gap-1.5 text-xs font-medium" style={{color:'#16a34a'}}><CheckCircle2 className="w-3 h-3"/>Unlocked</div>}
                  </motion.div>
                );})}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Edit Profile Modal */}
      <AnimatePresence>
        {editOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4"
            style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(8px)'}}
            onClick={() => setEditOpen(false)}>
            <motion.div initial={{opacity:0,scale:0.96,y:16}} animate={{opacity:1,scale:1,y:0}}
              exit={{opacity:0,scale:0.96}} transition={{duration:0.2}}
              className="card w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.01em'}}>Edit Profile</h2>
                <button onClick={() => setEditOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{background:'#f8fafc',color:'#94a3b8'}}
                  onMouseEnter={e => e.currentTarget.style.background='#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background='#f8fafc'}>
                  ✕
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                    style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Display Name</label>
                  <input type="text" value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Your name"
                    style={{fontSize:14}}/>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                    style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Location</label>
                  <input type="text" value={editLocation}
                    onChange={e => setEditLocation(e.target.value)}
                    placeholder="City, Country"
                    style={{fontSize:14}}/>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                    style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Home Airport (IATA)</label>
                  <input type="text" value={editAirport}
                    onChange={e => setEditAirport(e.target.value.toUpperCase())}
                    placeholder="TAS"
                    style={{fontSize:14,fontFamily:'"B612 Mono",monospace',letterSpacing:'0.04em'}}/>
                </div>

                <div>
                  <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                    style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>Bio</label>
                  <textarea value={editBio}
                    onChange={e => setEditBio(e.target.value)}
                    placeholder="Tell other spotters about yourself…"
                    rows={3}
                    style={{resize:'vertical',fontSize:13}}/>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-6">
                <button onClick={() => setEditOpen(false)}
                  className="btn-outline flex-1 justify-center"
                  style={{height:40,fontSize:13}}>Cancel</button>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="btn-primary flex-1 justify-center"
                  style={{height:40,fontSize:13,opacity:saving?0.6:1}}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
