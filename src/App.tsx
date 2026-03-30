import { useState, useEffect } from 'react';
import { Navbar, Footer } from './components/Layout';
import { ExplorePage }       from './components/ExplorePage';
import { MapPage }           from './components/MapPage';
import { FleetPage }         from './components/FleetPage';
import { CommunityPage }     from './components/CommunityPage';
import { StatsPage }         from './components/StatsPage';
import { ProfilePage }       from './components/ProfilePage';
import { UploadPage }        from './components/UploadPage';
import { AircraftDetailPage }from './components/AircraftDetailPage';
import { AuthPage }          from './components/AuthPage';
import { AdminPage }         from './components/AdminPage';
import { SettingsPage }      from './components/SettingsPage';
import { Page }              from './types';
import { AnimatePresence, motion } from 'motion/react';
import { supabase, signOut } from './lib/supabase';

interface AppUser {
  id:          string;
  username:    string;
  displayName: string;
  rank:        string;
  avatar:      string;
  role:        'user' | 'moderator' | 'admin';
}

function mapDbRole(dbRole: string | null | undefined): 'user' | 'moderator' | 'admin' {
  if (!dbRole) return 'user';
  const lower = dbRole.toLowerCase();
  if (lower === 'admin') return 'admin';
  if (lower === 'moderator') return 'moderator';
  return 'user';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('explore');
  const [appUser, setAppUser]         = useState<AppUser | null>(null);
  const [authModal, setAuthModal]     = useState<'login'|'register'|null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  const buildAppUser = (userId: string, email: string | undefined, meta: Record<string, any> | undefined, profile: any): AppUser => ({
    id:          userId,
    username:    profile?.username || meta?.username || email?.split('@')[0] || 'spotter',
    displayName: profile?.display_name || meta?.full_name || email?.split('@')[0] || 'Spotter',
    rank:        profile?.rank || 'Observer',
    avatar:      (profile?.display_name?.[0] || email?.[0] || 'S').toUpperCase(),
    role:        mapDbRole(profile?.role),
  });

  useEffect(() => {
    const loadProfile = async (userId: string) => {
      try {
        const profilePromise = supabase
          .from('user_profiles')
          .select('username, display_name, rank, role')
          .eq('id', userId)
          .single();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile load timeout')), 5000)
        );

        const { data: profile, error } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.warn('Failed to load profile:', error);
          return null;
        }
        return profile;
      } catch (err) {
        console.warn('Profile load error:', err);
        return null;
      }
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        setAppUser(buildAppUser(session.user.id, session.user.email, session.user.user_metadata, profile));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        setAppUser(buildAppUser(session.user.id, session.user.email, session.user.user_metadata, profile));
        setAuthModal(null);
      } else {
        setAppUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigate = (page: Page) => {
    const PROTECTED: Page[] = ['upload', 'profile', 'settings'];
    if (PROTECTED.includes(page) && !appUser) {
      setAuthModal('login');
      return;
    }
    if (page === 'admin' && appUser?.role !== 'admin' && appUser?.role !== 'moderator') {
      return;
    }
    setCurrentPage(page);
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
      case 'explore':        return <ExplorePage onAircraftClick={() => navigate('aircraft-detail')} setCurrentPage={navigate} />;
      case 'map':            return <MapPage />;
      case 'fleet':          return <FleetPage onAircraftClick={() => navigate('aircraft-detail')} />;
      case 'community':      return <CommunityPage />;
      case 'stats':          return <StatsPage />;
      case 'profile':        return <ProfilePage />;
      case 'upload':         return <UploadPage />;
      case 'aircraft-detail':return <AircraftDetailPage />;
      case 'settings':       return <SettingsPage onBack={() => navigate('profile')} />;
      case 'admin':          return <AdminPage />;
      default:               return <ExplorePage onAircraftClick={() => navigate('aircraft-detail')} setCurrentPage={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>
      <Navbar
        currentPage={currentPage}
        setCurrentPage={navigate}
        user={appUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModal('login')}
        onSignUp={() => setAuthModal('register')}
        isAdmin={appUser?.role === 'admin' || appUser?.role === 'moderator'}
      />

      <div className="flex flex-1" style={{ paddingTop: 52, background: '#f5f5f7' }}>

        <main className="flex-1 min-w-0">
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