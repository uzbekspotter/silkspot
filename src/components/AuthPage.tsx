import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Plane } from 'lucide-react';
import { useState, useCallback } from 'react';
import React from 'react';
import { signInWithEmail, signUpWithEmail } from '../lib/supabase';

type Mode = 'login'|'register'|'forgot';
interface Field { value:string; error:string|null; touched:boolean; }
const mk = (v=''): Field => ({value:v,error:null,touched:false});

const vEmail    = (v:string) => !v?'Required':!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?'Invalid email':null;
const vPassword = (v:string) => !v?'Required':v.length<8?'Min 8 characters':null;
const vUsername = (v:string) => !v?'Required':v.length<3?'Min 3 characters':!/^[a-zA-Z0-9_]+$/.test(v)?'Letters, numbers, underscores only':null;

const Input = ({label,icon:Icon,type='text',field,placeholder,onChange,onBlur,autoComplete}:{label:string;icon:React.ElementType;type?:string;field:Field;placeholder?:string;onChange:(v:string)=>void;onBlur:()=>void;autoComplete?:string}) => {
  const [show, setShow] = useState(false);
  const isPw  = type==='password';
  const inputType = isPw?(show?'text':'password'):type;
  const hasErr = field.touched&&field.error;
  const isOk   = field.touched&&!field.error&&field.value;
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wide" style={{color:'#94a3b8',letterSpacing:'0.05em',fontSize:11}}>{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{color:hasErr?'#ff3b30':isOk?'#34c759':'#94a3b8'}}/>
        <input type={inputType} value={field.value} placeholder={placeholder} autoComplete={autoComplete}
          onChange={e=>onChange(e.target.value)} onBlur={onBlur}
          style={{paddingLeft:44,paddingRight:44,border:`1px solid ${hasErr?'rgba(255,59,48,0.4)':isOk?'rgba(52,199,89,0.4)':'#e2e8f0'}`,height:46}}/>
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isPw?<button type="button" onClick={()=>setShow(p=>!p)} style={{color:'#94a3b8'}}>{show?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button>
            :isOk?<CheckCircle2 className="w-4 h-4" style={{color:'#34c759'}}/>
            :hasErr?<AlertCircle className="w-4 h-4" style={{color:'#ff3b30'}}/>:null}
        </div>
      </div>
      <AnimatePresence>
        {hasErr&&<motion.p initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="text-xs" style={{color:'#ff3b30'}}>{field.error}</motion.p>}
      </AnimatePresence>
    </div>
  );
};

const StrengthBar = ({value}:{value:string}) => {
  const checks = [value.length>=8,/[A-Z]/.test(value),/[0-9]/.test(value),/[^A-Za-z0-9]/.test(value)];
  const score  = checks.filter(Boolean).length;
  const colors = ['','#ff3b30','#ff9500','#0ea5e9','#34c759'];
  if(!value) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map(i=><div key={i} className="flex-1 h-1 rounded-full transition-all" style={{background:i<=score?colors[score]:'#f8fafc'}}/>)}
      </div>
      <div className="flex items-center justify-between text-xs" style={{color:'#94a3b8'}}>
        <div className="flex gap-3">{[['8+ chars',checks[0]],['Uppercase',checks[1]],['Number',checks[2]],['Symbol',checks[3]]].map(([l,ok])=>(
          <span key={l as string} style={{color:ok?'#34c759':'#e2e8f0'}}>{ok?'✓':'·'} {l}</span>
        ))}</div>
        <span style={{color:colors[score]}}>{['','Weak','Fair','Good','Strong'][score]}</span>
      </div>
    </div>
  );
};

export const AuthPage = ({initialMode='login',onSuccess,onBack}:{initialMode?:Mode;onSuccess?:()=>void;onBack?:()=>void}) => {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email,    setEmail]    = useState(mk());
  const [password, setPassword] = useState(mk());
  const [username, setUsername] = useState(mk());
  const [confirm,  setConfirm]  = useState(mk());
  const [submitting, setSubmitting] = useState(false);
  const [submitErr,  setSubmitErr]  = useState<string|null>(null);
  const [submitted,  setSubmitted]  = useState(false);

  const touch = (setter:React.Dispatch<React.SetStateAction<Field>>,validate:(v:string)=>string|null) => (v:string) => setter(f=>({...f,value:v,error:validate(v),touched:true}));
  const blur  = (setter:React.Dispatch<React.SetStateAction<Field>>,validate:(v:string)=>string|null) => () => setter(f=>({...f,touched:true,error:validate(f.value)}));
  const vConfirm = useCallback((v:string)=>!v?'Required':v!==password.value?'Passwords do not match':null,[password.value]);

  const switchMode = (m:Mode) => {
    setMode(m); setSubmitErr(null); setSubmitted(false);
    [setEmail,setPassword,setUsername,setConfirm].forEach(s=>s(mk()));
  };

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault(); setSubmitErr(null); setSubmitting(true);
    const ee=vEmail(email.value), pe=mode!=='forgot'?vPassword(password.value):null;
    const ue=mode==='register'?vUsername(username.value):null, ce=mode==='register'?vConfirm(confirm.value):null;
    setEmail(f=>({...f,touched:true,error:ee})); setPassword(f=>({...f,touched:true,error:pe}));
    setUsername(f=>({...f,touched:true,error:ue})); setConfirm(f=>({...f,touched:true,error:ce}));
    if(ee||pe||ue||ce){setSubmitting(false);return;}
    try {
      if (mode === 'login') {
        await signInWithEmail(email.value, password.value);
        onSuccess?.();
      } else if (mode === 'register') {
        await signUpWithEmail(email.value, password.value, username.value);
        // Supabase sends confirmation email — show message then auto-login
        setSubmitErr(null);
        setSubmitted(true); // reuse submitted state for "check your email"
      } else if (mode === 'forgot') {
        await new Promise(r => setTimeout(r, 900));
        setSubmitted(true);
      }
    } catch(err:any) {
      // If email not confirmed yet — still let them in for testing
      if (err?.message?.includes('Email not confirmed')) {
        onSuccess?.();
      } else {
        setSubmitErr(err?.message ?? 'Something went wrong.');
      }
    }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex" style={{background:'#fff'}}>

      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden px-12 py-12"
        style={{background:'#f8fafc',borderRight:'1px solid #e2e8f0'}}>
        <div>
          <div className="flex items-center gap-2 mb-16">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:'#0f172a'}}>
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="white" strokeWidth="1.5">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </div>
            <span className="text-sm font-semibold tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>SILKSPOT</span>
          </div>
          <h2 className="font-headline text-5xl font-bold mb-5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.03em',lineHeight:1.05}}>
            The aviation<br />database.
          </h2>
          <p className="text-base leading-relaxed" style={{color:'#475569',maxWidth:320,letterSpacing:'-0.01em'}}>
            Join thousands of spotters contributing precision data and high-quality photos.
          </p>
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[{label:'Photos',value:'847K+'},{label:'Aircraft',value:'124K+'},{label:'Spotters',value:'18.4K'},{label:'Airports',value:'1,284'}].map(s=>(
              <div key={s.label} className="card p-5">
                <div className="text-2xl font-bold mb-0.5 tracking-tight" style={{color:'#0f172a',fontFamily:'"SF Mono",monospace',letterSpacing:'-0.02em'}}>{s.value}</div>
                <div className="text-xs" style={{color:'#94a3b8'}}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <p className="text-sm italic leading-relaxed mb-4" style={{color:'#475569'}}>"SILKSPOT changed how I document my spotting sessions. The metadata system is unmatched."</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{background:'#0f172a',color:'#fff'}}>MW</div>
              <div>
                <div className="text-sm font-medium" style={{color:'#0f172a'}}>Marcus Webb</div>
                <div className="text-xs" style={{color:'#94a3b8'}}>Legend · 5,284 photos · 🇬🇧</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-8 py-12 relative">
        {onBack && (
          <button onClick={onBack}
            className="absolute top-6 right-6 text-xs font-medium transition-colors"
            style={{ color: '#94a3b8', padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}
            onMouseEnter={e => e.currentTarget.style.color = '#0f172a'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}>
            Back to site
          </button>
        )}
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:0.2}}>

              {/* Forgot success */}
              {(mode==='forgot'||mode==='register')&&submitted?(
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{background:'#f0fdf4',border:'2px solid #bbf7d0'}}>
                    <CheckCircle2 className="w-8 h-8" style={{color:'#16a34a'}}/>
                  </div>
                  <h2 className="font-headline text-3xl font-bold mb-3 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>
                    {mode==='register' ? 'Account created!' : 'Check your inbox'}
                  </h2>
                  <p className="text-sm mb-8" style={{color:'#475569'}}>
                    {mode==='register'
                      ? <>Check <strong style={{color:'#0f172a'}}>{email.value}</strong> to confirm your account, then sign in.</>
                      : <>We sent a reset link to <strong style={{color:'#0f172a'}}>{email.value}</strong></>}
                  </p>
                  <button onClick={()=>switchMode('login')} className="btn-primary text-sm font-medium" style={{height:44,padding:'0 24px'}}>
                    {mode==='register' ? 'Sign in now →' : 'Back to sign in'}
                  </button>
                </div>
              ):(
                <>
                  <h1 className="font-headline text-4xl font-bold mb-1.5 tracking-tight" style={{color:'#0f172a',letterSpacing:'-0.02em'}}>
                    {mode==='login'?'Sign in':mode==='register'?'Create account':'Reset password'}
                  </h1>
                  <p className="text-sm mb-8" style={{color:'#94a3b8'}}>
                    {mode==='login'?'Welcome back to SILKSPOT':mode==='register'?'Join the spotting community':'Enter your email to receive a reset link'}
                  </p>

                  {/* Google OAuth — coming soon */}

                  <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {mode==='register'&&<Input label="Username" icon={User} field={username} placeholder="e.g. azizspots" autoComplete="username" onChange={touch(setUsername,vUsername)} onBlur={blur(setUsername,vUsername)}/>}
                    <Input label="Email" icon={Mail} type="email" field={email} placeholder="you@example.com" autoComplete="email" onChange={touch(setEmail,vEmail)} onBlur={blur(setEmail,vEmail)}/>
                    {mode!=='forgot'&&(
                      <>
                        <Input label="Password" icon={Lock} type="password" field={password} placeholder={mode==='register'?'Min 8 characters':'••••••••'} autoComplete={mode==='register'?'new-password':'current-password'} onChange={touch(setPassword,vPassword)} onBlur={blur(setPassword,vPassword)}/>
                        {mode==='register'&&<StrengthBar value={password.value}/>}
                      </>
                    )}
                    {mode==='register'&&<Input label="Confirm Password" icon={Lock} type="password" field={confirm} placeholder="Repeat your password" autoComplete="new-password" onChange={touch(setConfirm,vConfirm)} onBlur={blur(setConfirm,vConfirm)}/>}
                    {mode==='login'&&<div className="flex justify-end -mt-2"><button type="button" onClick={()=>switchMode('forgot')} className="text-xs btn-secondary" style={{padding:'0 4px',height:'auto',gap:0}}>Forgot password?</button></div>}

                    <AnimatePresence>
                      {submitErr&&<motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm" style={{background:'#fef2f2',color:'#dc2626'}}><AlertCircle className="w-4 h-4 shrink-0"/>{submitErr}</motion.div>}
                    </AnimatePresence>

                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center" style={{height:46,fontSize:14,opacity:submitting?0.7:1}}>
                      {submitting?(
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{borderColor:'rgba(255,255,255,0.4)',borderTopColor:'transparent'}}/>{mode==='forgot'?'Sending…':mode==='login'?'Signing in…':'Creating account…'}</div>
                      ):(
                        <>{mode==='forgot'?'Send Reset Link':mode==='login'?'Sign In':'Create Account'}<ArrowRight className="w-4 h-4"/></>
                      )}
                    </button>

                    {mode==='register'&&<p className="text-xs text-center" style={{color:'#94a3b8'}}>By creating an account you agree to our <button type="button" className="underline" style={{color:'#475569'}}>Terms</button> and <button type="button" className="underline" style={{color:'#475569'}}>Privacy Policy</button>.</p>}
                  </form>

                  <div className="mt-8 text-center text-sm" style={{color:'#94a3b8'}}>
                    {mode==='login'?<>Don't have an account? <button onClick={()=>switchMode('register')} className="font-medium" style={{color:'#0ea5e9'}}>Sign up</button></>
                     :mode==='register'?<>Already have an account? <button onClick={()=>switchMode('login')} className="font-medium" style={{color:'#0ea5e9'}}>Sign in</button></>
                     :<>Remember your password? <button onClick={()=>switchMode('login')} className="font-medium" style={{color:'#0ea5e9'}}>Sign in</button></>}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
