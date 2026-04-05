import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function PasswordRecoveryModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const resetLocal = () => {
    setPassword('');
    setConfirm('');
    setErr(null);
    setDone(false);
    setShowPw(false);
  };

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr('Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErr('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setDone(true);
    window.setTimeout(() => {
      handleClose();
    }, 1200);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl p-8 shadow-xl"
        style={{ background: '#fff', border: '1px solid #e2e8f0' }}
      >
        {done ? (
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#f0fdf4', border: '2px solid #bbf7d0' }}
            >
              <CheckCircle2 className="w-7 h-7" style={{ color: '#16a34a' }} />
            </div>
            <p className="text-sm font-medium" style={{ color: '#0f172a' }}>
              Password updated. You&apos;re signed in.
            </p>
          </div>
        ) : (
          <>
            <h2
              id="recovery-title"
              className="font-headline text-xl font-bold mb-1 tracking-tight"
              style={{ color: '#0f172a' }}
            >
              Set a new password
            </h2>
            <p className="text-sm mb-6" style={{ color: '#64748b' }}>
              Choose a strong password for your account.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: '#94a3b8', fontSize: 11 }}
                >
                  New password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: '#94a3b8' }}
                  />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl outline-none"
                    style={{
                      paddingLeft: 44,
                      paddingRight: 44,
                      height: 46,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    style={{ color: '#94a3b8' }}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium uppercase tracking-wide"
                  style={{ color: '#94a3b8', fontSize: 11 }}
                >
                  Confirm password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: '#94a3b8' }}
                  />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    autoComplete="new-password"
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full rounded-xl outline-none"
                    style={{
                      paddingLeft: 44,
                      height: 46,
                      border: '1px solid #e2e8f0',
                    }}
                  />
                </div>
              </div>
              <AnimatePresence>
                {err && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{ background: '#fef2f2', color: '#dc2626' }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {err}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary flex-1 justify-center"
                  style={{ height: 44 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 justify-center"
                  style={{ height: 44, opacity: loading ? 0.7 : 1 }}
                >
                  {loading ? 'Saving…' : 'Save password'}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
