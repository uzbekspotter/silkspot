import { useState, useEffect, useLayoutEffect } from 'react';
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
import { parseAppLocation, urlForAppState } from './lib/app-path';

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

type BootState = {
  page: Page;
  selectedPhotoId: string | null;
  selectedAircraftReg: string | null;
  selectedProfileUserId: string | null;
  mapFocusAirportIata: string | null;
  pageBeforeAircraft: Page;
  replaceUnknownUrl: boolean;
};

function readBootState(): BootState {
  if (typeof window === 'undefined') {
    return {
      page: 'explore',
      selectedPhotoId: null,
      selectedAircraftReg: null,
      selectedProfileUserId: null,
      mapFocusAirportIata: null,
      pageBeforeAircraft: 'explore',
      replaceUnknownUrl: false,
    };
  }
  const loc = parseAppLocation(window.location.pathname, window.location.search);
  const st = window.history.state as { pageBeforeAircraft?: Page } | null;
  return {
    page: loc.page,
    selectedPhotoId: loc.selectedPhotoId,
    selectedAircraftReg: loc.selectedAircraftReg,
    selectedProfileUserId: loc.selectedProfileUserId,
    mapFocusAirportIata: loc.mapFocusAirportIata,
    pageBeforeAircraft: (st?.pageBeforeAircraft as Page) || 'explore',
    replaceUnknownUrl: !loc.recognized,
  };
}

export default function App() {
  const [routeInit] = useState(() => readBootState());
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>(() => routeInit.page);
  const [appUser, setAppUser]         = useState<AppUser | null>(null);
  const [authModal, setAuthModal]     = useState<'login'|'register'|null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(() => routeInit.selectedPhotoId);
  const [selectedAircraftReg, setSelectedAircraftReg] = useState<string | null>(() => routeInit.selectedAircraftReg);
  const [pageBeforeAircraft, setPageBeforeAircraft] = useState<Page>(() => routeInit.pageBeforeAircraft);
  const [mapFocusAirportIata, setMapFocusAirportIata] = useState<string | null>(() => routeInit.mapFocusAirportIata);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(() => routeInit.selectedProfileUserId);

  useLayoutEffect(() => {
    if (routeInit.replaceUnknownUrl) {
      window.history.replaceState(window.history.state, '', '/');
    }
  }, [routeInit.replaceUnknownUrl]);

  const openPhoto = (photoId: string) => {
    setSelectedPhotoId(photoId);
    setCurrentPage('photo-detail');
    window.history.pushState({}, '', urlForAppState({ page: 'photo-detail', selectedPhotoId: photoId }));
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
      setSessionChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      void applySession(session, event);
      if (session?.user) setAuthModal(null);
      setSessionChecked(true);
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

  useEffect(() => {
    const onPop = () => {
      const loc = parseAppLocation(window.location.pathname, window.location.search);
      if (!loc.recognized) {
        window.history.replaceState({}, '', '/');
        setCurrentPage('explore');
        setSelectedPhotoId(null);
        setSelectedAircraftReg(null);
        setSelectedProfileUserId(null);
        setMapFocusAirportIata(null);
        return;
      }
      const st = window.history.state as { pageBeforeAircraft?: Page } | null;
      setCurrentPage(loc.page);
      setSelectedPhotoId(loc.selectedPhotoId);
      setSelectedAircraftReg(loc.selectedAircraftReg);
      setSelectedProfileUserId(loc.selectedProfileUserId);
      setMapFocusAirportIata(loc.mapFocusAirportIata);
      if (loc.page === 'aircraft-detail' && st?.pageBeforeAircraft) {
        setPageBeforeAircraft(st.pageBeforeAircraft);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    const PROTECTED: Page[] = ['upload', 'profile', 'settings'];
    if (!appUser && PROTECTED.includes(currentPage)) {
      setAuthModal('login');
      setCurrentPage('explore');
      setSelectedPhotoId(null);
      setSelectedAircraftReg(null);
      setSelectedProfileUserId(null);
      setMapFocusAirportIata(null);
      window.history.replaceState({}, '', '/');
      return;
    }
    if (
      currentPage === 'admin' &&
      appUser &&
      appUser.role !== 'admin' &&
      appUser.role !== 'moderator' &&
      appUser.role !== 'screener'
    ) {
      setCurrentPage('explore');
      setSelectedPhotoId(null);
      setSelectedAircraftReg(null);
      setSelectedProfileUserId(null);
      setMapFocusAirportIata(null);
      window.history.replaceState({}, '', '/');
    }
  }, [sessionChecked, appUser, currentPage]);

  const openAircraftDetail = (registration: string, fromPage: Page) => {
    const r = registration.trim().toUpperCase().replace(/\s+/g, '');
    if (!r) return;
    setSelectedAircraftReg(r);
    setPageBeforeAircraft(fromPage);
    setCurrentPage('aircraft-detail');
    window.history.pushState(
      { pageBeforeAircraft: fromPage },
      '',
      urlForAppState({ page: 'aircraft-detail', selectedAircraftReg: r }),
    );
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
    const keepMapFocus = page === 'map' ? mapFocusAirportIata : null;
    const keepPhoto = page === 'photo-detail' ? selectedPhotoId : null;
    const keepAircraft = page === 'aircraft-detail' ? selectedAircraftReg : null;
    if (page !== 'map') setMapFocusAirportIata(null);
    if (page !== 'photo-detail') setSelectedPhotoId(null);
    if (page !== 'aircraft-detail') setSelectedAircraftReg(null);
    setSelectedProfileUserId(null);
    setCurrentPage(page);
    window.history.pushState(
      {},
      '',
      urlForAppState({
        page,
        selectedPhotoId: keepPhoto,
        selectedAircraftReg: keepAircraft,
        selectedProfileUserId: null,
        mapFocusAirportIata: keepMapFocus,
      }),
    );
  };

  const openSpotterProfile = (userId: string) => {
    if (!userId?.trim()) return;
    if (!appUser) {
      setAuthModal('login');
      return;
    }
    setSelectedProfileUserId(userId);
    setCurrentPage('profile');
    window.history.pushState(
      {},
      '',
      urlForAppState({ page: 'profile', selectedProfileUserId: userId }),
    );
  };

  const openMapAtAirport = (iata: string) => {
    const code = iata.trim().toUpperCase();
    setMapFocusAirportIata(code || null);
    setCurrentPage('map');
    window.history.pushState(
      {},
      '',
      urlForAppState({ page: 'map', mapFocusAirportIata: code || null }),
    );
  };

  const handleAuthSuccess = () => {
    setAuthModal(null);
  };

  const handleSignOut = async () => {
    await signOut();
    setAppUser(null);
    setCurrentPage('explore');
    setSelectedPhotoId(null);
    setSelectedAircraftReg(null);
    setSelectedProfileUserId(null);
    setMapFocusAirportIata(null);
    window.history.replaceState({}, '', '/');
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
  if (currentPage === 'login') {
    return (
      <AuthPage
        initialMode="login"
        onSuccess={handleAuthSuccess}
        onBack={() => {
          setCurrentPage('explore');
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }
  if (currentPage === 'register') {
    return (
      <AuthPage
        initialMode="register"
        onSuccess={handleAuthSuccess}
        onBack={() => {
          setCurrentPage('explore');
          window.history.replaceState({}, '', '/');
        }}
      />
    );
  }

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
          onBack={() => { window.history.back(); }}
          onPhotoClick={openPhoto}
          appUserId={appUser?.id ?? null}
          isStaff={
            appUser?.role === 'admin' ||
            appUser?.role === 'moderator' ||
            appUser?.role === 'screener'
          }
        />
      );
      case 'photo-detail':   return (
        <PhotoDetailPage
          photoId={selectedPhotoId}
          onBack={() => { window.history.back(); }}
          onPhotoClick={openPhoto}
          onOpenAircraft={(reg) => openAircraftDetail(reg, 'explore')}
          onNavigate={navigate}
          onOpenMapAirport={openMapAtAirport}
        />
      );
      case 'settings':       return <SettingsPage onBack={() => { window.history.back(); }} />;
      case 'admin':          return (
        <AdminPage
          onPhotoClick={openPhoto}
          canUseReviewTools={
            appUser?.role === 'admin' ||
            appUser?.role === 'moderator' ||
            appUser?.role === 'screener'
          }
        />
      );
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