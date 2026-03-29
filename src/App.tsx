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
import { Page }              from './types';
import { AnimatePresence, motion } from 'motion/react';
import { supabase, signOut } from './lib/supabase';

/* Demo auth state — replace with useAuth() hook when Supabase is configured */
interface DemoUser {
  id:          string;
  username:    string;
  displayName: string;
  rank:        string;
  avatar:      string;
  role:        'user' | 'moderator' | 'admin';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('explore');
  const [demoUser, setDemoUser]       = useState<DemoUser | null>(null);
  const [authModal, setAuthModal]     = useState<'login'|'register'|null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, [currentPage]);

  // Listen to Supabase auth state changes
  useEffect(() => {

    // Helper function to load profile with timeout
    const loadProfile = async (userId: string) => {
      try {
        // Timeout after 5 seconds
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

    // Check existing session on load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        // Load user profile to get role
        const profile = await loadProfile(session.user.id);

        setDemoUser({
          id:          session.user.id,
          username:    profile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'spotter',
          displayName: profile?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Spotter',
          rank:        profile?.rank || 'Observer',
          avatar:      (profile?.display_name?.[0] || session.user.email?.[0] || 'S').toUpperCase(),
          role:        profile?.role?.toLowerCase() as 'user' | 'moderator' | 'admin' || 'user',
        });
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Load user profile to get role
        const profile = await loadProfile(session.user.id);

        setDemoUser({
          id:          session.user.id,
          username:    profile?.username || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'spotter',
          displayName: profile?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Spotter',
          rank:        profile?.rank || 'Observer',
          avatar:      (profile?.display_name?.[0] || session.user.email?.[0] || 'S').toUpperCase(),
          role:        profile?.role?.toLowerCase() as 'user' | 'moderator' | 'admin' || 'user',
        });
        setAuthModal(null);
      } else {
        setDemoUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* Guard protected pages — redirect to login */
  const navigate = (page: Page) => {
    const PROTECTED: Page[] = ['upload', 'profile'];
    if (PROTECTED.includes(page) && !demoUser) {
      setAuthModal('login');
      return;
    }
    // Admin panel — silently redirect non-admins
    if (page === 'admin' && demoUser?.role !== 'admin' && demoUser?.role !== 'moderator') {
      return;
    }
    setCurrentPage(page);
  };

  const handleAuthSuccess = () => {
    setDemoUser({
      id: 'demo-001', username: 'azizspots',
      displayName: 'Aziz Karimov', rank: 'Expert', avatar: 'AK',
      role: 'admin',
    });
    setAuthModal(null);
    setCurrentPage('profile');
  };

  const handleSignOut = async () => {
    await signOut();
    setDemoUser(null);
    setCurrentPage('explore');
  };

  /* Full-screen auth pages */
  if (authModal) {
    return (
      <AuthPage
        initialMode={authModal}
        onSuccess={handleAuthSuccess}
      />
    );
  }
  if (currentPage === 'login')    return <AuthPage initialMode="login"    onSuccess={handleAuthSuccess} />;
  if (currentPage === 'register') return <AuthPage initialMode="register" onSuccess={handleAuthSuccess} />;

  const renderPage = () => {
    switch (currentPage) {
      case 'explore':        return <ExplorePage onAircraftClick={() => navigate('aircraft-detail')} setCurrentPage={navigate} />;
      case 'map':            return <MapPage />;
      case 'fleet':          return <FleetPage onAircraftClick={() => navigate('aircraft-detail')} />;
      case 'community':      return <CommunityPage />;
      case 'stats':          return <StatsPage />;
      case 'profile':        return <ProfilePage />;
      case 'upload':         return <UploadPage />;
      case 'aircraft-detail':return <AircraftDetailPage />
      case 'admin':          return <AdminPage />;
      default:               return <ExplorePage onAircraftClick={() => navigate('aircraft-detail')} setCurrentPage={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#ffffff' }}>
      <Navbar
        currentPage={currentPage}
        setCurrentPage={navigate}
        user={demoUser}
        onSignOut={handleSignOut}
        onSignIn={() => setAuthModal('login')}
        onSignUp={() => setAuthModal('register')}
        isAdmin={demoUser?.role === 'admin' || demoUser?.role === 'moderator'}
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
