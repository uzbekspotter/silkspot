import { lazy, Suspense, useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar, Footer } from './components/Layout';
import { PasswordRecoveryModal } from './components/PasswordRecoveryModal';
import { SkyWaveBackdrop } from './components/SkyWaveBackdrop';
import { parseAppLocation, urlForAppState } from './lib/app-path';
import { REFRESH_APP_USER_EVENT } from './lib/app-user-refresh';
import { supabase, signOut } from './lib/supabase';
import { Page } from './types';

const ExplorePage = lazy(() => import('./components/ExplorePage').then(m => ({ default: m.ExplorePage })));
const MapPage = lazy(() => import('./components/MapPage').then(m => ({ default: m.MapPage })));
const FleetPage = lazy(() => import('./components/FleetPage').then(m => ({ default: m.FleetPage })));
const CommunityPage = lazy(() => import('./components/CommunityPage').then(m => ({ default: m.CommunityPage })));
const StatsPage = lazy(() => import('./components/StatsPage').then(m => ({ default: m.StatsPage })));
const AboutPage = lazy(() => import('./components/AboutPage').then(m => ({ default: m.AboutPage })));
const AboutWakePage = lazy(() => import('./components/AboutWakePage').then(m => ({ default: m.AboutWakePage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const UploadPage = lazy(() => import('./components/UploadPage').then(m => ({ default: m.UploadPage })));
const AircraftDetailPage = lazy(() =>
  import('./components/AircraftDetailPage').then(m => ({ default: m.AircraftDetailPage })),
);
const PhotoDetailPage = lazy(() => import('./components/PhotoDetailPage').then(m => ({ default: m.PhotoDetailPage })));
const AuthPage = lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const LegalDocPage = lazy(() => import('./components/LegalDocPage').then(m => ({ default: m.LegalDocPage })));
const AdminPage = lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(m => ({ default: m.SettingsPage })));

function PageLoadFallback() {
  return (
    <div
      className="flex min-h-[50vh] w-full items-center justify-center py-16"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-8 w-8 shrink-0 animate-spin" style={{ color: '#94a3b8' }} />
    </div>
  );
}

interface AppUser {
  id:          string;
  username:    string;
  displayName: string;
  rank:        string;
  avatar:      string;
  avatarUrl?:  string;
  role:        'user' | 'moderator' | 'admin' | 'screener';
}

type LegalReturnTarget =
  | { mode: 'modal'; auth: 'login' | 'register' }
  | { mode: 'route'; page: 'login' | 'register' };

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
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(() => routeInit.selectedPhotoId);
  const [selectedAircraftReg, setSelectedAircraftReg] = useState<string | null>(() => routeInit.selectedAircraftReg);
  const [pageBeforeAircraft, setPageBeforeAircraft] = useState<Page>(() => routeInit.pageBeforeAircraft);
  const [mapFocusAirportIata, setMapFocusAirportIata] = useState<string | null>(() => routeInit.mapFocusAirportIata);
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<string | null>(() => routeInit.selectedProfileUserId);
  const [fleetSearchSeed, setFleetSearchSeed] = useState<{ q: string; k: number } | null>(null);

  const legalReturnRef = useRef<LegalReturnTarget | null>(null);

  const openLegalDoc = (doc: 'terms' | 'privacy', ret: LegalReturnTarget) => {
    legalReturnRef.current = ret;
    setAuthModal(null);
    setCurrentPage(doc);
    window.history.pushState({}, '', doc === 'terms' ? '/terms' : '/privacy');
  };

  const closeLegalDoc = () => {
    const r = legalReturnRef.current;
    legalReturnRef.current = null;
    if (r?.mode === 'modal') {
      setCurrentPage('explore');
      setAuthModal(r.auth);
      window.history.replaceState({}, '', '/');
      return;
    }
    if (r?.mode === 'route') {
      setCurrentPage(r.page);
      window.history.replaceState({}, '', r.page === 'login' ? '/login' : '/register');
      return;
    }
    window.history.replaceState({}, '', '/');
    setCurrentPage('explore');
  };

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
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecoveryOpen(true);
      }
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
    const guestOwnProfileOnly =
      currentPage === 'profile' && !selectedProfileUserId;
    if (!appUser && (currentPage === 'upload' || currentPage === 'settings' || guestOwnProfileOnly)) {
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
    legalReturnRef.current = null;
    if (!appUser && (page === 'upload' || page === 'settings' || page === 'profile')) {
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

  const recoveryOverlay = (
    <PasswordRecoveryModal
      open={passwordRecoveryOpen}
      onClose={() => setPasswordRecoveryOpen(false)}
    />
  );

  if (authModal) {
    return (
      <>
        <Suspense fallback={<PageLoadFallback />}>
          <AuthPage
            initialMode={authModal}
            onSuccess={handleAuthSuccess}
            onBack={() => setAuthModal(null)}
            onOpenTerms={() => openLegalDoc('terms', { mode: 'modal', auth: authModal })}
            onOpenPrivacy={() => openLegalDoc('privacy', { mode: 'modal', auth: authModal })}
          />
        </Suspense>
        {recoveryOverlay}
      </>
    );
  }
  if (currentPage === 'login') {
    return (
      <>
        <Suspense fallback={<PageLoadFallback />}>
          <AuthPage
            initialMode="login"
            onSuccess={handleAuthSuccess}
            onBack={() => {
              setCurrentPage('explore');
              window.history.replaceState({}, '', '/');
            }}
            onOpenTerms={() => openLegalDoc('terms', { mode: 'route', page: 'login' })}
            onOpenPrivacy={() => openLegalDoc('privacy', { mode: 'route', page: 'login' })}
          />
        </Suspense>
        {recoveryOverlay}
      </>
    );
  }
  if (currentPage === 'register') {
    return (
      <>
        <Suspense fallback={<PageLoadFallback />}>
          <AuthPage
            initialMode="register"
            onSuccess={handleAuthSuccess}
            onBack={() => {
              setCurrentPage('explore');
              window.history.replaceState({}, '', '/');
            }}
            onOpenTerms={() => openLegalDoc('terms', { mode: 'route', page: 'register' })}
            onOpenPrivacy={() => openLegalDoc('privacy', { mode: 'route', page: 'register' })}
          />
        </Suspense>
        {recoveryOverlay}
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'explore':        return <ExplorePage onAircraftClick={(reg) => reg && openAircraftDetail(reg, 'explore')} setCurrentPage={navigate} onPhotoClick={openPhoto} />;
      case 'map':            return <MapPage focusAirportIata={mapFocusAirportIata} />;
      case 'fleet':          return (
        <FleetPage
          fleetSearchSeed={fleetSearchSeed ?? undefined}
          onAircraftClick={(reg) => openAircraftDetail(reg, 'fleet')}
        />
      );
      case 'community':      return <CommunityPage />;
      case 'stats':          return <StatsPage onNavigate={navigate} onOpenSpotter={openSpotterProfile} />;
      case 'about':          return <AboutPage onNavigate={navigate} />;
      case 'about-wake':     return <AboutWakePage onNavigate={navigate} />;
      case 'terms':          return <LegalDocPage variant="terms" onBack={closeLegalDoc} />;
      case 'privacy':        return <LegalDocPage variant="privacy" onBack={closeLegalDoc} />;
      case 'profile':        return <ProfilePage onPhotoClick={openPhoto} onNavigate={(p) => navigate(p)} profileUserId={selectedProfileUserId} viewerUserId={appUser?.id ?? null} onRequireLogin={() => setAuthModal('login')} onOpenMapAirport={openMapAtAirport} />;
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
          onOpenUploaderProfile={openSpotterProfile}
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
      {recoveryOverlay}
      <SkyWaveBackdrop />
      <Navbar
        currentPage={currentPage}
        setCurrentPage={navigate}
        user={appUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModal('login')}
        onSignUp={() => setAuthModal('register')}
        isAdmin={appUser?.role === 'admin' || appUser?.role === 'moderator' || appUser?.role === 'screener'}
        onSearchAircraft={(reg) => openAircraftDetail(reg, 'explore')}
        onSearchAirport={(iata) => openMapAtAirport(iata)}
        onSearchSpotter={(id) => openSpotterProfile(id)}
        onSearchFleet={(query) => {
          const t = query.trim();
          if (!t) return;
          setFleetSearchSeed(prev => ({ q: t, k: (prev?.k ?? 0) + 1 }));
          navigate('fleet');
        }}
      />

      <div className="relative z-10 flex flex-1" style={{ paddingTop: 52 }}>

        <main className="relative z-10 flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={currentPage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}>
              <Suspense fallback={<PageLoadFallback />}>
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
          <Footer setCurrentPage={navigate} />
        </main>
      </div>
    </div>
  );
}