import {
  Plane, Map as MapIcon, Users, BarChart3,
  Search, LayoutGrid, PlusCircle, Settings, HelpCircle,
  LogOut, User, Shield, X, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Page } from '../types';

interface NavbarProps {
  currentPage: Page; setCurrentPage: (p: Page) => void;
  user?: { username: string; displayName: string; rank: string; avatar: string; avatarUrl?: string } | null;
  onSignIn?: () => void; onSignOut?: () => void; onSignUp?: () => void;
  isAdmin?: boolean;
}

export const Navbar = ({ currentPage, setCurrentPage, user, onSignIn, onSignOut, onSignUp, isAdmin }: NavbarProps) => {
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const nav = [
    { id:'explore'   as Page, label:'Explore'    },
    { id:'fleet'     as Page, label:'Fleet'      },
    { id:'map'       as Page, label:'Map'        },
    { id:'community' as Page, label:'Community'  },
    { id:'stats'     as Page, label:'Stats'      },
  ];

  return (
    <nav className="glass fixed top-0 w-full z-50" style={{ height: 52 }}>
      <div className="flex items-center h-full site-w gap-8" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>

        {/* Logo */}
        <button onClick={() => setCurrentPage('explore')}
          className="shrink-0 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity"
          style={{ color: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', letterSpacing: '-0.01em', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}>
          SteppeSpot
        </button>

        {/* Nav */}
        <div className="hidden md:flex items-center gap-7">
          {nav.map(item => (
            <button key={item.id} onClick={() => setCurrentPage(item.id)}
              className="nav-link"
              style={{ opacity: currentPage === item.id ? 1 : 0.55, fontWeight: currentPage === item.id ? 500 : 400 }}>
              {item.label}
            </button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3 ml-auto">

          {/* Search */}
          <AnimatePresence mode="wait">
            {searchOpen ? (
              <motion.div key="open"
                initial={{ width: 0, opacity: 0 }} animate={{ width: 200, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="relative overflow-hidden">
                <input autoFocus type="text" placeholder="Search…"
                  style={{ height: 32, fontSize: 13, paddingRight: 32, borderRadius: 980 }}
                  onBlur={() => setSearchOpen(false)} />
                <X className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 cursor-pointer"
                  style={{ color: '#94a3b8' }} onMouseDown={() => setSearchOpen(false)} />
              </motion.div>
            ) : (
              <button onClick={() => setSearchOpen(true)}
                className="nav-link" style={{ opacity: 0.55, fontSize: 12, display:'flex', alignItems:'center', gap:4 }}>
                <Search className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Search</span>
              </button>
            )}
          </AnimatePresence>

          {/* Upload */}
          <button onClick={() => setCurrentPage('upload')}
            className="flex items-center gap-1.5 font-medium transition-all"
            style={{ height: 32, padding: '0 14px', fontSize: 12, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            <PlusCircle className="w-3.5 h-3.5" />
            Upload
          </button>

          {/* Auth */}
          {user ? (
            <div className="relative">
              <button onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors"
                style={{ background: '#f8fafc' }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl.startsWith('avatars/') ? `/r2/${user.avatarUrl}` : user.avatarUrl} alt=""
                    className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: '#1e40af', color: '#fff', fontSize: 10 }}>
                    {user.displayName[0]}
                  </div>
                )}
                <span className="hidden sm:block text-xs" style={{ color: '#0f172a', opacity: 0.8 }}>{user.displayName}</span>
                <ChevronDown className="w-3 h-3 hidden sm:block" style={{ color: '#94a3b8' }} />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-2 z-50 overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 14, width: 196, boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="text-xs font-medium" style={{ color: '#0f172a' }}>{user.displayName}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94a3b8', fontFamily: '"JetBrains Mono", monospace' }}>@{user.username}</div>
                    </div>
                    {[
                      { icon: User,       label: 'Profile',      page: 'profile' as Page, show: true },
                      { icon: PlusCircle, label: 'Upload Photo', page: 'upload'  as Page, show: true },
                      { icon: Shield,     label: 'Admin Panel',  page: 'admin'   as Page, show: isAdmin },
                      { icon: Settings,   label: 'Settings',     page: 'settings' as Page, show: true },
                    ].filter(item => item.show).map(({ icon: Icon, label, page }) => (
                      <button key={label}
                        onClick={() => { if (page) setCurrentPage(page); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-colors"
                        style={{ color: '#0f172a', opacity: 0.8 }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.8'; }}>
                        <Icon className="w-3.5 h-3.5" />{label}
                      </button>
                    ))}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button onClick={() => { onSignOut?.(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left"
                        style={{ color: '#ff3b30' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <LogOut className="w-3.5 h-3.5" />Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onSignIn}
                style={{ height: 32, padding: '0 14px', fontSize: 12, background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>Sign in</button>
              <button onClick={onSignUp}
                style={{ height: 32, padding: '0 14px', fontSize: 12, background: '#0f172a', color: '#fff', border: '1px solid #0f172a', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>Register</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Sidebar removed — navigation is in Navbar only

export const Footer = ({ setCurrentPage }: { setCurrentPage: (p: Page) => void }) => (
  <footer style={{ background: '#fff', borderTop: '1px solid #e2e8f0' }} className="mt-0">
    <div className="site-w py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
      <div className="col-span-2 md:col-span-1 space-y-3">
        <div className="text-sm font-semibold" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>SteppeSpot</div>
        <p className="text-xs leading-relaxed" style={{ color: '#94a3b8', maxWidth: 200 }}>
          Aviation spotting database for photographers worldwide.
        </p>
        <div className="flex items-center gap-2 text-xs" style={{ color: '#94a3b8' }}>
          <div className="live-dot" /><span>Open platform</span>
        </div>
      </div>
      {[
        { title:'Explore', links:[
          {label:'Browse Photos', page:'explore' as Page},{label:'Fleet Database', page:'fleet' as Page},
          {label:'Map View',      page:'map'     as Page},{label:'Upload Photo',   page:'upload' as Page},
        ]},
        { title:'Community', links:[
          {label:'Forums',       page:'community' as Page},
          {label:'Top Spotters', page:'stats'     as Page},
          {label:'Statistics',   page:'stats'     as Page},
        ]},
        { title:'Account', links:[
          {label:'Sign In',  page:'login'    as Page},
          {label:'Register', page:'register' as Page},
          {label:'Profile',  page:'profile'  as Page},
        ]},
      ].map(col => (
        <div key={col.title}>
          <div className="text-xs font-semibold mb-4" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>{col.title}</div>
          <ul className="space-y-2.5">
            {col.links.map(link => (
              <li key={link.label}>
                <button onClick={() => setCurrentPage(link.page)}
                  className="text-xs transition-colors" style={{ color: '#475569' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}>
                  {link.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="site-w py-5 flex items-center justify-between" style={{ borderTop: '1px solid #e2e8f0' }}>
      <span className="text-xs" style={{ color: '#94a3b8' }}>© {new Date().getFullYear()} SteppeSpot. All rights reserved.</span>
      <span className="text-xs" style={{ color: '#cbd5e1', fontFamily: '"JetBrains Mono", monospace' }}>v1.0</span>
    </div>
  </footer>
);
