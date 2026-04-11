import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useCallback } from 'react';
import React from 'react';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithMagicLink,
  requestPasswordReset,
  signInWithGoogle,
} from '../lib/supabase';
import { SkyWaveBackdropLayers } from './SkyWaveBackdrop';

type Mode = 'login' | 'register' | 'forgot';
type Channel = 'password' | 'magic';

/** Set `VITE_ENABLE_GOOGLE_AUTH=true` when Google OAuth is configured in Supabase. */
const SHOW_GOOGLE_AUTH = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

/** Register — left column: photo full width on top; below, gradient continuing the sky from `public/images/UZBS5714.jpg`. */
const REGISTER_LEFT_IMAGE = '/images/UZBS5714.jpg';
/** Aircraft sits on the right side of the frame — anchor crop there so `object-cover` does not show only contrails. */
const REGISTER_HERO_OBJECT_POSITION = '88% 35%';
const REGISTER_SKY_TOP = '#0a1a35';
const REGISTER_SKY_DEEP = '#040a14';

/**
 * Register hero — overlay on the photo only (`absolute inset-0` on the image strip).
 * Tweak these % until the fade into the text block looks seamless (no hard line).
 * - `REGISTER_HERO_FADE_CLEAR_UNTIL`: from top down, stay fully transparent (show aircraft / sky).
 * - `REGISTER_HERO_FADE_MID_AT`: where the soft haze peaks before full `REGISTER_SKY_TOP`.
 */
const REGISTER_HERO_FADE_CLEAR_UNTIL = '50%';
const REGISTER_HERO_FADE_MID_AT = '68%';
const REGISTER_HERO_FADE_MID_ALPHA = 0.22;

interface Field {
  value: string;
  error: string | null;
  touched: boolean;
}
const mk = (v = ''): Field => ({ value: v, error: null, touched: false });

const vEmail = (v: string) =>
  !v ? 'Required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : null;
const vPassword = (v: string) =>
  !v ? 'Required' : v.length < 8 ? 'Min 8 characters' : null;
const vUsername = (v: string) =>
  !v
    ? 'Required'
    : v.length < 3
      ? 'Min 3 characters'
      : !/^[a-zA-Z0-9_]+$/.test(v)
        ? 'Letters, numbers, underscores only'
        : null;

const Input = ({
  label,
  icon: Icon,
  type = 'text',
  field,
  placeholder,
  onChange,
  onBlur,
  autoComplete,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  field: Field;
  placeholder?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  autoComplete?: string;
}) => {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  const inputType = isPw ? (show ? 'text' : 'password') : type;
  const hasErr = field.touched && field.error;
  const isOk = field.touched && !field.error && field.value;
  return (
    <div className="space-y-1.5">
      <label
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}
      >
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: hasErr ? '#ff3b30' : isOk ? '#34c759' : '#94a3b8' }}
        />
        <input
          type={inputType}
          value={field.value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{
            paddingLeft: 44,
            paddingRight: 44,
            border: `1px solid ${hasErr ? 'rgba(255,59,48,0.4)' : isOk ? 'rgba(52,199,89,0.4)' : '#e2e8f0'}`,
            height: 46,
          }}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isPw ? (
            <button type="button" onClick={() => setShow((p) => !p)} style={{ color: '#94a3b8' }}>
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          ) : isOk ? (
            <CheckCircle2 className="w-4 h-4" style={{ color: '#34c759' }} />
          ) : hasErr ? (
            <AlertCircle className="w-4 h-4" style={{ color: '#ff3b30' }} />
          ) : null}
        </div>
      </div>
      <AnimatePresence>
        {hasErr && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs"
            style={{ color: '#ff3b30' }}
          >
            {field.error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

const StrengthBar = ({ value }: { value: string }) => {
  const checks = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  const colors = ['', '#ff3b30', '#ff9500', '#0ea5e9', '#34c759'];
  if (!value) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= score ? colors[score] : '#f8fafc' }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-xs" style={{ color: '#94a3b8' }}>
        <div className="flex gap-3">
          {(
            [
              ['8+ chars', checks[0]],
              ['Uppercase', checks[1]],
              ['Number', checks[2]],
              ['Symbol', checks[3]],
            ] as const
          ).map(([l, ok]) => (
            <span key={l} style={{ color: ok ? '#34c759' : '#e2e8f0' }}>
              {ok ? '✓' : '·'} {l}
            </span>
          ))}
        </div>
        <span style={{ color: colors[score] }}>{['', 'Weak', 'Fair', 'Good', 'Strong'][score]}</span>
      </div>
    </div>
  );
};

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function GoogleSignInButton({
  submitting,
  setSubmitting,
  setSubmitErr,
  className = '',
}: {
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  setSubmitErr: (v: string | null) => void;
  className?: string;
}) {
  const oauthMessage = (raw: string) => {
    const m = raw.toLowerCase();
    if (m.includes('not enabled') || m.includes('unsupported provider') || m.includes('validation_failed')) {
      return 'Google sign-in is not configured for this project yet. Use email below or enable Google in the Supabase Auth providers.';
    }
    return raw || 'Could not start Google sign-in.';
  };

  const handleGoogle = async () => {
    setSubmitErr(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitErr(oauthMessage(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleGoogle()}
      disabled={submitting}
      className={`w-full flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors ${className}`.trim()}
      style={{
        height: 46,
        border: '1px solid #e2e8f0',
        background: '#fff',
        color: '#0f172a',
        opacity: submitting ? 0.7 : 1,
      }}
    >
      <GoogleIcon />
      Continue with Google
    </button>
  );
}

type InboxNotice = { title: string; body: React.ReactNode; cta: string };

export const AuthPage = ({
  initialMode = 'login',
  onSuccess,
  onBack,
}: {
  initialMode?: Mode;
  onSuccess?: () => void;
  onBack?: () => void;
}) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [channel, setChannel] = useState<Channel>('password');
  const [email, setEmail] = useState(mk());
  const [password, setPassword] = useState(mk());
  const [username, setUsername] = useState(mk());
  const [confirm, setConfirm] = useState(mk());
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [inboxNotice, setInboxNotice] = useState<InboxNotice | null>(null);

  const touch =
    (setter: React.Dispatch<React.SetStateAction<Field>>, validate: (v: string) => string | null) =>
    (v: string) =>
      setter((f) => ({ ...f, value: v, error: validate(v), touched: true }));
  const blur =
    (setter: React.Dispatch<React.SetStateAction<Field>>, validate: (v: string) => string | null) =>
    () =>
      setter((f) => ({ ...f, touched: true, error: validate(f.value) }));
  const vConfirm = useCallback(
    (v: string) => (!v ? 'Required' : v !== password.value ? 'Passwords do not match' : null),
    [password.value],
  );

  const switchMode = (m: Mode) => {
    setMode(m);
    setSubmitErr(null);
    setInboxNotice(null);
    setChannel('password');
    [setEmail, setPassword, setUsername, setConfirm].forEach((s) => s(mk()));
  };

  const sendMagicLink = async () => {
    setSubmitErr(null);
    setSubmitting(true);
    const ee = vEmail(email.value);
    const ue = mode === 'register' ? vUsername(username.value) : null;
    setEmail((f) => ({ ...f, touched: true, error: ee }));
    if (mode === 'register') {
      setUsername((f) => ({ ...f, touched: true, error: ue }));
    }
    if (ee || ue) {
      setSubmitting(false);
      return;
    }
    try {
      if (mode === 'login') {
        await signInWithMagicLink(email.value, { isSignUp: false });
        setInboxNotice({
          title: 'Check your inbox',
          body: (
            <>
              We sent a sign-in link to <strong style={{ color: '#0f172a' }}>{email.value}</strong>. Open it on
              this device to continue.
            </>
          ),
          cta: 'Back to sign in',
        });
      } else {
        await signInWithMagicLink(email.value, { isSignUp: true, username: username.value });
        setInboxNotice({
          title: 'Check your inbox',
          body: (
            <>
              We sent a sign-up link to <strong style={{ color: '#0f172a' }}>{email.value}</strong>. After you open
              it, your username <strong style={{ color: '#0f172a' }}>{username.value}</strong> will be saved.
            </>
          ),
          cta: 'Back to sign in',
        });
      }
    } catch (err: unknown) {
      setSubmitErr(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    setSubmitting(true);
    const ee = vEmail(email.value);
    const pe = mode !== 'forgot' ? vPassword(password.value) : null;
    const ue = mode === 'register' ? vUsername(username.value) : null;
    const ce = mode === 'register' ? vConfirm(confirm.value) : null;
    setEmail((f) => ({ ...f, touched: true, error: ee }));
    setPassword((f) => ({ ...f, touched: true, error: pe }));
    setUsername((f) => ({ ...f, touched: true, error: ue }));
    setConfirm((f) => ({ ...f, touched: true, error: ce }));
    if (ee || pe || ue || ce) {
      setSubmitting(false);
      return;
    }
    try {
      if (mode === 'login') {
        await signInWithEmail(email.value, password.value);
        onSuccess?.();
      } else if (mode === 'register') {
        await signUpWithEmail(email.value, password.value, username.value);
        setSubmitErr(null);
        setInboxNotice({
          title: 'Account created!',
          body: (
            <>
              Check <strong style={{ color: '#0f172a' }}>{email.value}</strong> to confirm your account, then sign
              in.
            </>
          ),
          cta: 'Sign in now →',
        });
      } else {
        await requestPasswordReset(email.value);
        setInboxNotice({
          title: 'Check your inbox',
          body: (
            <>
              We sent a reset link to <strong style={{ color: '#0f172a' }}>{email.value}</strong>.
            </>
          ),
          cta: 'Back to sign in',
        });
      }
    } catch (err: unknown) {
      const anyErr = err as { message?: string };
      if (anyErr?.message?.includes('Email not confirmed')) {
        onSuccess?.();
      } else {
        setSubmitErr(anyErr?.message ?? 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const registerLeftColumn = mode === 'register';

  const leftPanelMarketing = (
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-16">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.28)',
          }}
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.5">
            <rect x="1" y="1" width="6" height="6" rx="1" />
            <rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" />
            <rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight" style={{ color: '#fff', letterSpacing: '-0.02em' }}>
          SILKSPOT
        </span>
      </div>
      <h2
        className="font-headline text-5xl font-bold mb-5 tracking-tight"
        style={{
          color: '#fff',
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          textShadow: '0 2px 28px rgba(0,0,0,0.35)',
        }}
      >
        Built for
        <br />
        planespotters.
      </h2>
      <p
        className="text-base leading-relaxed space-y-3"
        style={{
          color: 'rgba(255,255,255,0.92)',
          maxWidth: 380,
          letterSpacing: '-0.01em',
          textShadow: '0 1px 14px rgba(0,0,0,0.28)',
        }}
      >
        <span className="block">
          Upload your shots, earn achievements, and watch your personal stats grow—approved uploads, rank, badges, and
          the story of how you spot.
        </span>
        <span className="block">
          Help keep the shared catalog honest: aircraft types, operators, hubs, and fleet data the whole community
          uses. Explore, correct, and show what you saw.
        </span>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#fff' }}>
      {/* Left panel: register = photo on top + extended sky; sign-in / reset = site SkyWave */}
      {registerLeftColumn ? (
        <div
          className="hidden lg:flex lg:w-2/3 flex-col min-h-screen relative overflow-hidden min-w-0"
          style={{ borderRight: '1px solid rgba(255,255,255,0.12)' }}
        >
          <div className="relative w-full shrink-0" style={{ height: 'min(50vh, 460px)' }}>
            <img
              src={REGISTER_LEFT_IMAGE}
              alt=""
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: REGISTER_HERO_OBJECT_POSITION }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(to bottom,
                  transparent 0%,
                  transparent ${REGISTER_HERO_FADE_CLEAR_UNTIL},
                  rgba(10, 26, 53, ${REGISTER_HERO_FADE_MID_ALPHA}) ${REGISTER_HERO_FADE_MID_AT},
                  ${REGISTER_SKY_TOP} 100%)`,
              }}
              aria-hidden
            />
          </div>
          <div
            className="relative flex min-h-0 flex-1 flex-col justify-center px-12 py-10"
            style={{
              background: `linear-gradient(180deg, ${REGISTER_SKY_TOP} 0%, ${REGISTER_SKY_DEEP} 72%, #020508 100%)`,
            }}
          >
            {leftPanelMarketing}
          </div>
        </div>
      ) : (
        <div
          className="hidden lg:flex lg:w-2/3 flex-col justify-center relative overflow-hidden px-12 py-12 min-w-0 min-h-screen"
          style={{ borderRight: '1px solid rgba(255,255,255,0.22)' }}
        >
          <SkyWaveBackdropLayers />
          {leftPanelMarketing}
        </div>
      )}

      {/* Right: Form */}
      <div className="flex-1 lg:flex-none lg:w-1/3 flex items-center justify-center px-8 py-12 relative min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-6 right-6 text-xs font-medium transition-colors"
            style={{ color: '#94a3b8', padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#0f172a')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            Back to site
          </button>
        )}
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + (inboxNotice ? '-sent' : '')}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {inboxNotice ? (
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
                    style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}
                  >
                    <CheckCircle2 className="w-8 h-8" style={{ color: '#16a34a' }} />
                  </div>
                  <h2
                    className="font-headline text-3xl font-bold mb-3 tracking-tight"
                    style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
                  >
                    {inboxNotice.title}
                  </h2>
                  <p className="text-sm mb-8" style={{ color: '#475569' }}>
                    {inboxNotice.body}
                  </p>
                  <button
                    onClick={() => switchMode('login')}
                    className="btn-primary text-sm font-medium"
                    style={{ height: 44, padding: '0 24px' }}
                  >
                    {inboxNotice.cta}
                  </button>
                </div>
              ) : (
                <>
                  <h1
                    className="font-headline text-4xl font-bold mb-1.5 tracking-tight"
                    style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
                  >
                    {mode === 'login' ? 'Sign in' : mode === 'register' ? 'Create account' : 'Reset password'}
                  </h1>
                  <p className="text-sm mb-6" style={{ color: '#94a3b8' }}>
                    {mode === 'login'
                      ? 'Welcome back to SILKSPOT'
                      : mode === 'register'
                        ? 'Join the planespotting community'
                        : 'Enter your email to receive a reset link'}
                  </p>

                  {mode !== 'forgot' && (
                    <>
                      {SHOW_GOOGLE_AUTH && (
                        <>
                          <GoogleSignInButton
                            submitting={submitting}
                            setSubmitting={setSubmitting}
                            setSubmitErr={setSubmitErr}
                          />
                          <div className="flex items-center gap-3 my-6">
                            <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                            <span className="text-xs" style={{ color: '#94a3b8' }}>
                              or continue with email
                            </span>
                            <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
                          </div>
                        </>
                      )}
                      <div
                        className="flex rounded-xl p-0.5 mb-5"
                        style={{ background: '#f1f5f9', border: '1px solid #e2e8f0' }}
                      >
                        <button
                          type="button"
                          className="flex-1 text-xs font-semibold py-2.5 rounded-lg transition-all"
                          style={{
                            background: channel === 'password' ? '#fff' : 'transparent',
                            color: channel === 'password' ? '#0f172a' : '#64748b',
                            boxShadow: channel === 'password' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                          }}
                          onClick={() => setChannel('password')}
                        >
                          Password
                        </button>
                        <button
                          type="button"
                          className="flex-1 text-xs font-semibold py-2.5 rounded-lg transition-all"
                          style={{
                            background: channel === 'magic' ? '#fff' : 'transparent',
                            color: channel === 'magic' ? '#0f172a' : '#64748b',
                            boxShadow: channel === 'magic' ? '0 1px 2px rgba(15,23,42,0.06)' : 'none',
                          }}
                          onClick={() => setChannel('magic')}
                        >
                          Email link
                        </button>
                      </div>
                    </>
                  )}

                  {mode === 'forgot' && SHOW_GOOGLE_AUTH && (
                    <GoogleSignInButton
                      submitting={submitting}
                      setSubmitting={setSubmitting}
                      setSubmitErr={setSubmitErr}
                      className="mb-6"
                    />
                  )}

                  {channel === 'magic' && mode !== 'forgot' ? (
                    <div className="space-y-4">
                      {mode === 'register' && (
                        <Input
                          label="Username"
                          icon={User}
                          field={username}
                          placeholder="e.g. azizspots"
                          autoComplete="username"
                          onChange={touch(setUsername, vUsername)}
                          onBlur={blur(setUsername, vUsername)}
                        />
                      )}
                      <Input
                        label="Email"
                        icon={Mail}
                        type="email"
                        field={email}
                        placeholder="you@example.com"
                        autoComplete="email"
                        onChange={touch(setEmail, vEmail)}
                        onBlur={blur(setEmail, vEmail)}
                      />
                      <AnimatePresence>
                        {submitErr && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                            style={{ background: '#fef2f2', color: '#dc2626' }}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {submitErr}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void sendMagicLink()}
                        className="btn-primary w-full justify-center"
                        style={{ height: 46, fontSize: 14, opacity: submitting ? 0.7 : 1 }}
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }}
                            />
                            Sending…
                          </div>
                        ) : (
                          <>
                            {mode === 'login' ? 'Send sign-in link' : 'Send sign-up link'}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
                        No password to remember — we email you a secure link. The link expires after a short time.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                      {mode === 'register' && (
                        <Input
                          label="Username"
                          icon={User}
                          field={username}
                          placeholder="e.g. azizspots"
                          autoComplete="username"
                          onChange={touch(setUsername, vUsername)}
                          onBlur={blur(setUsername, vUsername)}
                        />
                      )}
                      <Input
                        label="Email"
                        icon={Mail}
                        type="email"
                        field={email}
                        placeholder="you@example.com"
                        autoComplete="email"
                        onChange={touch(setEmail, vEmail)}
                        onBlur={blur(setEmail, vEmail)}
                      />
                      {mode !== 'forgot' && (
                        <>
                          <Input
                            label="Password"
                            icon={Lock}
                            type="password"
                            field={password}
                            placeholder={mode === 'register' ? 'Min 8 characters' : '••••••••'}
                            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                            onChange={touch(setPassword, vPassword)}
                            onBlur={blur(setPassword, vPassword)}
                          />
                          {mode === 'register' && <StrengthBar value={password.value} />}
                        </>
                      )}
                      {mode === 'register' && (
                        <Input
                          label="Confirm Password"
                          icon={Lock}
                          type="password"
                          field={confirm}
                          placeholder="Repeat your password"
                          autoComplete="new-password"
                          onChange={touch(setConfirm, vConfirm)}
                          onBlur={blur(setConfirm, vConfirm)}
                        />
                      )}
                      {mode === 'login' && (
                        <div className="flex justify-end -mt-2">
                          <button
                            type="button"
                            onClick={() => switchMode('forgot')}
                            className="text-xs btn-secondary"
                            style={{ padding: '0 4px', height: 'auto', gap: 0 }}
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}

                      <AnimatePresence>
                        {submitErr && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                            style={{ background: '#fef2f2', color: '#dc2626' }}
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {submitErr}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary w-full justify-center"
                        style={{ height: 46, fontSize: 14, opacity: submitting ? 0.7 : 1 }}
                      >
                        {submitting ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                              style={{ borderColor: 'rgba(255,255,255,0.4)', borderTopColor: 'transparent' }}
                            />
                            {mode === 'forgot' ? 'Sending…' : mode === 'login' ? 'Signing in…' : 'Creating account…'}
                          </div>
                        ) : (
                          <>
                            {mode === 'forgot' ? 'Send reset link' : mode === 'login' ? 'Sign in' : 'Create account'}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      {mode === 'register' && (
                        <p className="text-xs text-center" style={{ color: '#94a3b8' }}>
                          By creating an account you agree to our{' '}
                          <button type="button" className="underline" style={{ color: '#475569' }}>
                            Terms
                          </button>{' '}
                          and{' '}
                          <button type="button" className="underline" style={{ color: '#475569' }}>
                            Privacy Policy
                          </button>
                          .
                        </p>
                      )}
                    </form>
                  )}

                  {!inboxNotice && (
                    <div className="mt-8 text-center text-sm" style={{ color: '#94a3b8' }}>
                      {mode === 'login' ? (
                        <>
                          Don&apos;t have an account?{' '}
                          <button onClick={() => switchMode('register')} className="font-medium" style={{ color: '#0ea5e9' }}>
                            Sign up
                          </button>
                        </>
                      ) : mode === 'register' ? (
                        <>
                          Already have an account?{' '}
                          <button onClick={() => switchMode('login')} className="font-medium" style={{ color: '#0ea5e9' }}>
                            Sign in
                          </button>
                        </>
                      ) : (
                        <>
                          Remember your password?{' '}
                          <button onClick={() => switchMode('login')} className="font-medium" style={{ color: '#0ea5e9' }}>
                            Sign in
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
