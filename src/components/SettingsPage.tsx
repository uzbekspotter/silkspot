import { motion } from 'motion/react';
import { Settings, User, Mail, MapPin, Plane, Globe2, Camera, Bell, Shield, ArrowLeft, CheckCircle2, Loader2, ImagePlus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import { dispatchRefreshAppUser } from '../lib/app-user-refresh';
import { proxyImageUrl } from '../lib/storage';
import { searchAirports, type Airport } from '../airports';
import type { Page } from '../types';
import type { User as AuthUser } from '@supabase/supabase-js';

interface SettingsPageProps {
  onBack?: () => void;
}

export const SettingsPage = ({ onBack }: SettingsPageProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [homeAirport, setHomeAirport] = useState('');
  const [apSugg, setApSugg] = useState<Airport[]>([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();
      if (!user) return;
      setAuthUser(user);

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setHomeAirport(data.home_airport_iata || data.home_airport_id || '');
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser) return;

    if (!file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Avatar must be under 2 MB');
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);

      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `avatars/${authUser.id}_${Date.now()}.${ext}`;

      const presignRes = await fetch('/api/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, contentType: file.type }),
      });

      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error('Upload failed');

      const newUrl = path;

      const { error: dbErr } = await supabase
        .from('user_profiles')
        .update({ avatar_url: newUrl })
        .eq('id', authUser.id);

      if (dbErr) throw dbErr;

      setAvatarUrl(newUrl);
      setProfile({ ...profile, avatar_url: newUrl });
      dispatchRefreshAppUser();
    } catch (err: any) {
      setError(err?.message || 'Avatar upload failed');
    } finally {
      setAvatarUploading(false);
      if (avatarInput.current) avatarInput.current.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const user = await getCurrentUser();
      if (!user) return;

      const updates: Record<string, any> = {
        display_name: displayName || null,
        bio: bio || null,
        location: location || null,
        home_airport_iata: homeAirport ? homeAirport.toUpperCase() : null,
      };

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, ...updates });
      dispatchRefreshAppUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: '#e2e8f0', borderTopColor: 'transparent' }} />
          <p style={{ color: '#94a3b8' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: '#fff', minHeight: '100vh' }}>
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w max-w-screen-md py-8">
          <div className="flex items-center gap-4 mb-2">
            {onBack && (
              <button onClick={onBack}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#475569' }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="text-xs font-medium uppercase tracking-wide mb-1"
                style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Account</div>
              <h1 className="font-headline text-3xl font-bold tracking-tight" style={{ color: '#0f172a', letterSpacing: '-0.01em' }}>
                Settings
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="site-w max-w-screen-md py-8 space-y-8">

        {/* Profile Information */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-4 h-4" style={{ color: '#94a3b8' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Profile Information</h2>
          </div>
          <div className="space-y-5">

            {/* Avatar */}
            <div className="flex items-center gap-5">
              <div className="relative group">
                {avatarUrl ? (
                  <img src={proxyImageUrl(avatarUrl)} alt="Avatar"
                    className="w-20 h-20 rounded-2xl object-cover"
                    referrerPolicy="no-referrer"
                    style={{ border: '3px solid #f1f5f9' }} />
                ) : (
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl"
                    style={{ background: '#0f172a', color: '#fff', border: '3px solid #f1f5f9' }}>
                    {(displayName || profile?.username || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <button onClick={() => avatarInput.current?.click()} disabled={avatarUploading}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.5)', cursor: avatarUploading ? 'wait' : 'pointer' }}>
                  {avatarUploading
                    ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#fff' }} />
                    : <Camera className="w-5 h-5" style={{ color: '#fff' }} />}
                </button>
                <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>
              <div>
                <div className="text-sm font-medium" style={{ color: '#0f172a' }}>Profile Photo</div>
                <button onClick={() => avatarInput.current?.click()} disabled={avatarUploading}
                  className="text-xs mt-1 transition-colors"
                  style={{ color: '#0ea5e9', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  {avatarUploading ? 'Uploading...' : avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
                <p className="text-[10px] mt-0.5" style={{ color: '#94a3b8' }}>JPG, PNG. Max 2 MB.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Username</label>
              <input type="text" value={profile?.username || ''} disabled
                style={{ fontSize: 14, opacity: 0.6, cursor: 'not-allowed', fontFamily: '"SF Mono", monospace' }} />
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Username cannot be changed.</p>
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Display Name</label>
              <input type="text" value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your full name"
                style={{ fontSize: 14 }} />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Bio</label>
              <textarea value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell other spotters about yourself..."
                rows={3}
                style={{ resize: 'vertical', fontSize: 13 }} />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Location</label>
              <input type="text" value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, Country"
                style={{ fontSize: 14 }} />
            </div>

            <div>
              <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}>Home Airport (IATA)</label>
              <div className="relative">
                <input type="text" value={homeAirport}
                  onChange={e => {
                    const v = e.target.value.toUpperCase();
                    setHomeAirport(v);
                    setApSugg(v.length >= 2 ? searchAirports(v, 6) : []);
                  }}
                  placeholder="e.g. TAS"
                  style={{ fontSize: 14, fontFamily: '"B612 Mono", monospace', letterSpacing: '0.04em' }} />
                {apSugg.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                    style={{ background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: 240, overflowY: 'auto' }}>
                    {apSugg.map(a => (
                      <button key={a.iata}
                        onClick={() => { setHomeAirport(a.iata); setApSugg([]); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ borderBottom: '1px solid #f5f5f7' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: 16 }}>{a.flag}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color: '#0ea5e9', fontFamily: '"B612 Mono", monospace' }}>{a.iata}</span>
                            <span className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{a.city}</span>
                          </div>
                          <div className="text-xs truncate" style={{ color: '#94a3b8' }}>{a.country}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="w-4 h-4" style={{ color: '#94a3b8' }} />
            <h2 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Account</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div className="text-sm" style={{ color: '#0f172a' }}>Email</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>{authUser?.email || 'Not set'}</div>
              </div>
              {authUser?.email_confirmed_at ? (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#f0fdf4', color: '#16a34a' }}>Verified</span>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#fffbeb', color: '#d97706' }}>Unverified</span>
              )}
            </div>
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div className="text-sm" style={{ color: '#0f172a' }}>Role</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>Your account permissions</div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: '#f8fafc', color: '#475569', textTransform: 'capitalize' }}>
                {profile?.role?.toLowerCase() || 'spotter'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <div className="text-sm" style={{ color: '#0f172a' }}>Member since</div>
                <div className="text-xs" style={{ color: '#94a3b8' }}>
                  {profile?.joined_at ? new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button onClick={handleSave} disabled={saving}
            className="btn-primary flex items-center gap-2"
            style={{ height: 44, padding: '0 28px', fontSize: 14, opacity: saving ? 0.6 : 1 }}>
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" />Saved!</>
            ) : (
              'Save changes'
            )}
          </button>
          {error && (
            <span className="text-xs" style={{ color: '#dc2626' }}>{error}</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
