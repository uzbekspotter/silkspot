import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navbar, Footer } from './components/Layout';
import { ExplorePage }       from './components/ExplorePage';
import { MapPage }           from './components/MapPage';
import { FleetPage }         from './components/FleetPage';
import { CommunityPage }     from './components/CommunityPage';
import { StatsPage }         from './components/StatsPage';
import { ProfilePage }       from './components/ProfilePage';
import { UploadPage }        from './components/UploadPage';
import { AircraftDetailPage }from './components/AircraftDetailPage';
import { PhotoDetailPage }   from './components/PhotoDetailPage';
import { AuthPage }          from './components/AuthPage';
import { AdminPage }         from './components/AdminPage';
import { SettingsPage }      from './components/SettingsPage';
import { Page }              from './types';
import { AnimatePresence, motion } from 'motion/react';
import { supabase, signOut } from './lib/supabase';
import { REFRESH_APP_USER_EVENT } from './lib/app-user-refresh';
import { SkyWaveBackdrop } from './components/SkyWaveBackdrop';

interface AppUser {
  id:          string;
  username:    string;
  displayName: string;
  rank:        string;
  avatar:      string;
  avatarUrl?:  string;
  role:        'user' | 'moderator' | 'admin' | 'screener';
}

function mapDbRole(dbRole: string | null | undefined): 'user' | 'moderator' | 'admin' | 'screener' {
  if (!dbRole) return 'user';
  const lower = dbRole.toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'moderator') return 'moderator';
  if (lower === 'screener') return 'screener';
  return 'user';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('explore');
  const [appUser, setAppUser]         = useState<AppUser | null>(null);
  const [authModal, setAuthModal]     = useState<'login'|'register'|null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedAircraftReg, setSelectedAircraftReg] = useState<string | null>(null);
  const [pageBeforeAircraft, setPageBeforeAircraft] = useState<Page>('fleet');
  const [mapFocusAirportIata, setMapFocusAirportIata] = useState<string | null>(null);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(null);

  const openPhoto = (photoId: string) => {
    setSelectedPhotoId(photoId);
    setCurrentPage('photo-detail');
  };

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  const buildAppUser = (userId: string, email: string | undefined, meta: Record<string, any> | undefined, profile: any): AppUser => ({
    id:          userId,
    username:    profile?.username || meta?.username || email?.split('@')[0] || 'spotter',
    displayName: profile?.display_name || meta?.full_name || email?.split('@')[0] || 'Spotter',
    rank:        profile?.rank || 'Observer',
    avatar:      (profile?.display_name?.[0] || email?.[0] || 'S').toUpperCase(),
    avatarUrl:   profile?.avatar_url || undefined,
    role:        mapDbRole(profile?.role),
  });

  useEffect(() => {
    let profileChannel: ReturnType<typeof supabase.channel> | null = null;

    const clearProfileChannel = () => {
      if (profileChannel) {
        supabase.removeChannel(profileChannel);
        profileChannel = null;
      }
    };

    const fetchProfileRow = async (userId: string) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('username, display_name, rank, role, avatar_url')
          .eq('id', userId)
          .single();
        if (!error && data) return data;
        if (attempt < 2) await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
      }
      console.warn('Failed to load user_profiles row after retries');
      return null;
    };

    const applySession = async (session: Session | null, authEvent: string | null) => {
      if (!session?.user) {
        clearProfileChannel();
        setAppUser(null);
        return;
      }

      const { id, email, user_metadata } = session.user;
      const profile = await fetchProfileRow(id);
      setAppUser(buildAppUser(id, email, user_metadata, profile));

      if (authEvent === 'TOKEN_REFRESHED') return;

      clearProfileChannel();
      profileChannel = supabase
        .channel(`profile-self:${id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_profiles',
            filter: `id=eq.${id}`,
          },
          async () => {
            const { data: { session: s } } = await supabase.auth.getSession();
            if (!s?.user || s.user.id !== id) return;
            const p = await fetchProfileRow(id);
            setAppUser(buildAppUser(id, s.user.email, s.user.user_metadata, p));
          }
        )
        .subscribe();
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      void applySession(session, null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void applySession(session, event);
      if (session?.user) setAuthModal(null);
    });

    const onWindowRefresh = () => {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.user) return;
        const { id, email, user_metadata } = session.user;
        const p = await fetchProfileRow(id);
        setAppUser(buildAppUser(id, email, user_metadata, p));
      });
    };
    window.addEventListener(REFRESH_APP_USER_EVENT, onWindowRefresh);

    return () => {
      subscription.unsubscribe();
      clearProfileChannel();
      window.removeEventListener(REFRESH_APP_USER_EVENT, onWindowRefresh);
    };
  }, []);

  const openAircraftDetail = (registration: string, fromPage: Page) => {
    const r = registration.trim().toUpperCase().replace(/\s+/g, '');
    if (!r) return;
    setSelectedAircraftReg(r);
    setPageBeforeAircraft(fromPage);
    setCurrentPage('aircraft-detail');
  };

  const navigate = (page: Page) => {
    const PROTECTED: Page[] = ['upload', 'profile', 'settings'];
    if (PROTECTED.includes(page) && !appUser) {
      setAuthModal('login');
      return;
    }
    if (page === 'admin' && appUser?.role !== 'admin' && appUser?.role !== 'moderator' && appUser?.role !== 'screener') {
      return;
    }
    if (page !== 'map') setMapFocusAirportIata(null);
    // Default navigation resets selected external spotter profile.
    setSelectedProfileUserId(null);
    setCurrentPage(page);
  };

  const openSpotterProfile = (userId: string) => {
    if (!userId?.trim()) return;
    setSelectedProfileUserId(userId);
    setCurrentPage('profile');
  };

  const openMapAtAirport = (iata: string) => {
    const code = iata.trim().toUpperCase();
    setMapFocusAirportIata(code || null);
    setCurrentPage('map');
  };

  const handleAuthSuccess = () => {
    setAuthModal(null);
  };

  const handleSignOut = async () => {
    await signOut();
    setAppUser(null);
    setCurrentPage('explore');
  };

  if (authModal) {
    return (
      <AuthPage
        initialMode={authModal}
        onSuccess={handleAuthSuccess}
        onBack={() => setAuthModal(null)}
      />
    );
  }
  if (currentPage === 'login')    return <AuthPage initialMode="login"    onSuccess={handleAuthSuccess} onBack={() => setCurrentPage('explore')} />;
  if (currentPage === 'register') return <AuthPage initialMode="register" onSuccess={handleAuthSuccess} onBack={() => setCurrentPage('explore')} />;

  const renderPage = () => {
    switch (currentPage) {
      case 'explore':        return <ExplorePage onAircraftClick={(reg) => reg && openAircraftDetail(reg, 'explore')} setCurrentPage={navigate} onPhotoClick={openPhoto} />;
      case 'map':            return <MapPage focusAirportIata={mapFocusAirportIata} />;
      case 'fleet':          return <FleetPage onAircraftClick={(reg) => openAircraftDetail(reg, 'fleet')} />;
      case 'community':      return <CommunityPage />;
      case 'stats':          return <StatsPage onNavigate={navigate} onOpenSpotter={openSpotterProfile} />;
      case 'profile':        return <ProfilePage onPhotoClick={openPhoto} onNavigate={(p) => navigate(p)} profileUserId={selectedProfileUserId} />;
      case 'upload':         return <UploadPage onNavigate={navigate} />;
      case 'aircraft-detail':return (
        <AircraftDetailPage
          registration={selectedAircraftReg}
          onOpenRegistration={(r) => setSelectedAircraftReg(r.trim().toUpperCase().replace(/\s+/g, ''))}
          onBack={() => {
            setSelectedAircraftReg(null);
            setCurrentPage(pageBeforeAircraft);
          }}
          appUserId={appUser?.id ?? null}
          isStaff={appUser?.role === 'admin' || appUser?.role === 'moderator'}
        />
      );
      case 'photo-detail':   return (
        <PhotoDetailPage
          photoId={selectedPhotoId}
          onBack={() => navigate('explore')}
          onPhotoClick={openPhoto}
          onOpenAircraft={(reg) => openAircraftDetail(reg, 'explore')}
          onNavigate={navigate}
          onOpenMapAirport={openMapAtAirport}
        />
      );
      case 'settings':       return <SettingsPage onBack={() => navigate('profile')} />;
      case 'admin':          return <AdminPage onPhotoClick={openPhoto} />;
      default:               return <ExplorePage onAircraftClick={(reg) => reg && openAircraftDetail(reg, 'explore')} setCurrentPage={navigate} onPhotoClick={openPhoto} />;
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <SkyWaveBackdrop />
      <Navbar
        currentPage={currentPage}
        setCurrentPage={navigate}
        user={appUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModal('login')}
        onSignUp={() => setAuthModal('register')}
        isAdmin={appUser?.role === 'admin' || appUser?.role === 'moderator' || appUser?.role === 'screener'}
      />

      <div className="relative z-10 flex flex-1" style={{ paddingTop: 52 }}>

        <main className="relative z-10 flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
          <Footer setCurrentPage={navigate} />
        </main>
      </div>
    </div>
  );
}