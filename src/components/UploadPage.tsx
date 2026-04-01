import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, CheckCircle2, AlertCircle, Sparkles, X, ArrowRight,
  Shield, FileImage, HelpCircle, ChevronDown, Loader2, ImagePlus,
  Plane, Camera, Trash2
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import React from 'react';
import { searchAirports, airportsByCountry, COUNTRIES, type Airport } from '../airports';
import { searchAirlines, searchAircraftTypes } from '../aviation-data';
import { lookupAircraft, lookupAircraftBatch, contributeAircraftData } from '../aircraft-lookup';
import { uploadPhoto } from '../lib/storage';
import { supabase, getCurrentUser } from '../lib/supabase';
import { resolveOperatorId, resolveAircraftTypeId } from '../lib/upload-helpers';

// ── Constants ─────────────────────────────────────────────
const MAX_FILES     = 20; // v4
const MIN_SIZE_KB   = 250;
const MAX_WIDTH_PX  = 1440;

const CATEGORIES = ['Takeoff','Landing','Static','Cockpit','Air-to-Air','Night','Special Livery','Scrapped'];



// ── Types ─────────────────────────────────────────────────
type LookupState = 'idle' | 'loading' | 'found' | 'notfound';
type FileStatus  = 'pending' | 'validating' | 'valid' | 'error';

/** Match Fleet / DB registration keys (e.g. UK78703). */
function normRegKey(reg: string): string {
  return reg.toUpperCase().trim().replace(/\s+/g, '');
}

/** Persist batch "aircraft details" for the head registration; per-photo MSN for others. */
function aircraftHeadDetailsPatch(
  applyHead: boolean,
  photo: PhotoFile,
  acSerial: string,
  acFirstFlight: string,
  acConfig: string,
  acEngines: string,
  acStatus: string,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (applyHead) {
    const msn = acSerial.trim() || photo.msn?.trim() || '';
    if (msn) patch.msn = msn;
    if (acFirstFlight.trim()) patch.first_flight = acFirstFlight.trim().slice(0, 10);
    if (acConfig.trim()) patch.seat_config = acConfig.trim();
    if (acEngines.trim()) patch.engines = acEngines.trim();
    if (acStatus.trim()) {
      const st = acStatus.trim().toUpperCase().replace(/\s+/g, '_');
      if (['ACTIVE', 'STORED', 'SCRAPPED', 'WFU', 'PRESERVED'].includes(st)) patch.status = st;
    }
  } else if (photo.msn?.trim()) {
    patch.msn = photo.msn.trim();
  }
  return patch;
}

interface PhotoFile {
  id:       string;
  file:     File;
  preview:  string;
  status:   FileStatus;
  error?:   string;
  // auto-filled
  reg:      string;
  type:     string;
  mfr:      string;
  operator: string;
  // manual
  msn:      string;
  // manual fallback when not in DB
  manualAirline?: string;
  manualType?:    string;
}

// ── Helpers ───────────────────────────────────────────────
const extractRegFromFilename = (name: string): string => {
  // Match common registration patterns:
  // UK-32103, G-VROM, A6-EVB, N829AN, TC-JJU, F-WXWB, D-ABCD, etc.
  const clean = name.replace(/\.[^.]+$/, '').toUpperCase().replace(/[_\s]/g, '-');
  const patterns = [
    /\b([A-Z][0-9]-[A-Z0-9]{2,5})\b/,    // A7-ANL, B2-xxx style
    /\b([A-Z]{1,2}-[A-Z0-9]{2,5})\b/,   // G-VROM, HB-IJF, OK-SLX style
    /\b([A-Z]{2}[0-9]{4,6})\b/,          // UK32103 style (ex-Soviet)
    /\b([A-Z]{2}[0-9]{3}[A-Z]{2})\b/,    // AP-BGJ style
    /\b(N[0-9]{2,5}[A-Z]{0,2})\b/,       // N-number (USA)
    /\b([A-Z]{2}-[A-Z]{3})\b/,            // EI-GFA, VP-BTI style
    /\b(RA-[0-9]{5})\b/,                  // Russian RA-XXXXX
    /\b([A-Z]{2}[0-9]{3})\b/,              // UK001 style (short Uzbek)
  ];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return m[1];
  }
  return '';
};

const mfrFromName = (mfr: string): string => {
  if (!mfr) return 'Other';
  const m = mfr.toLowerCase();
  if (m.includes('airbus'))   return 'Airbus';
  if (m.includes('boeing'))   return 'Boeing';
  if (m.includes('embraer'))  return 'Embraer';
  if (m.includes('bombardier')) return 'Bombardier';
  if (m.includes('atr'))      return 'ATR';
  if (m.includes('antonov'))  return 'Antonov';
  if (m.includes('ilyushin')) return 'Ilyushin';
  if (m.includes('tupolev'))  return 'Tupolev';
  if (m.includes('sukhoi'))   return 'Other';
  return 'Other';
};

// ── Lookup — Supabase first, hexdb fallback ────────────────
// Thin wrapper so existing call-sites in processFiles still work
async function lookupByReg(reg: string): Promise<{ type: string; mfr: string; operator: string; msn: string } | null> {
  const result = await lookupAircraft(reg);
  if (!result) return null;
  return {
    type: result.typeName,
    mfr: result.manufacturer,
    operator: result.operator,
    msn: result.msn || '',
  };
}

// ── Validate image dimensions & size ─────────────────────
async function validateImage(file: File): Promise<{ok:boolean; error?:string}> {
  const isJpeg = file.type === 'image/jpeg' || /\.(jpg|jpeg)$/i.test(file.name);
  if (!isJpeg) {
    return { ok: false, error: 'Only JPEG files are accepted (.jpg / .jpeg)' };
  }
  const sizeKb = file.size / 1024;
  if (sizeKb < MIN_SIZE_KB) {
    return { ok: false, error: `File too small (${Math.round(sizeKb)} KB, min ${MIN_SIZE_KB} KB)` };
  }
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.width > MAX_WIDTH_PX) {
        resolve({ ok: false, error: `Too wide (${img.width}px, max ${MAX_WIDTH_PX}px)` });
      } else {
        resolve({ ok: true });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ ok: false, error: 'Could not read image' }); };
    img.src = url;
  });
}

// ── AutocompleteInput ───────────────────────────────────────
const AutocompleteInput = ({
  value, onChange, onSelect, placeholder, suggestions, labelKey, sublabelKey, minChars = 2,
}: {
  value:       string;
  onChange:    (v: string) => void;
  onSelect:    (item: any) => void;
  placeholder: string;
  suggestions: any[];
  labelKey:    string;
  sublabelKey?: string;
  minChars?:   number;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = open && value.length >= minChars && suggestions.length > 0;

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Enter' && suggestions.length === 1) {
            onSelect(suggestions[0]);
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        style={{ fontSize:11, height:26, padding:'0 7px' }}
        autoComplete="off"
      />
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
            className="rounded-lg overflow-hidden z-50"
            style={{
              position:'fixed',
              background:'#fff',
              border:'1px solid #e2e8f0',
              boxShadow:'0 8px 24px rgba(0,0,0,0.15)',
              maxHeight:200, overflowY:'auto',
              width: ref.current?.offsetWidth,
              top: (ref.current?.getBoundingClientRect().bottom ?? 0) + 4,
              left: ref.current?.getBoundingClientRect().left,
            }}>
            {suggestions.map((item, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); onSelect(item); setOpen(false); }}
                className="w-full text-left px-3 py-2 transition-colors"
                style={{ borderBottom: i < suggestions.length-1 ? '1px solid #f8fafc' : 'none' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#f0f9ff'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                <div className="text-xs font-medium" style={{ color:'#0f172a' }}>{item[labelKey]}</div>
                {sublabelKey && item[sublabelKey] && (
                  <div className="text-xs" style={{ color:'#94a3b8' }}>{item[sublabelKey]}</div>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── UI helpers ────────────────────────────────────────────
const Field = ({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label className="text-xs font-medium uppercase tracking-wide"
        style={{ color:'#94a3b8', letterSpacing:'0.05em', fontSize:11 }}>
        {label}{required && <span style={{ color:'#0ea5e9', marginLeft:3 }}>*</span>}
      </label>
      {hint && (
        <div className="group relative cursor-help">
          <HelpCircle className="w-3 h-3" style={{ color:'#d2d2d7' }}/>
          <div className="absolute right-0 bottom-full mb-2 w-48 px-3 py-2 rounded-xl text-xs leading-relaxed
            pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
            style={{ background:'#0f172a', color:'rgba(255,255,255,0.75)', boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
            {hint}
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

// ── Photo card ────────────────────────────────────────────
const PhotoCard = ({
  photo, index, onRemove, onMsnChange, onRegChange, onRetryLookup, onFieldChange,
}: {
  photo: PhotoFile; index: number;
  onRemove:      (id: string) => void;
  onMsnChange:   (id: string, msn: string) => void;
  onRegChange:   (id: string, reg: string) => void;
  onRetryLookup: (id: string) => void;
  onFieldChange: (id: string, field: 'manualAirline' | 'manualType', value: string) => void;
}) => {
  const statusColor = photo.status === 'valid'      ? '#16a34a'
                    : photo.status === 'error'      ? '#dc2626'
                    : photo.status === 'validating' ? '#d97706'
                    : '#94a3b8';

  // Has data from lookup?
  const hasData = !!(photo.operator || photo.type);
  // No reg in filename?
  const noReg = photo.status === 'valid' && !photo.reg;

  // Autocomplete state for manual fields
  const [airlineSugg,  setAirlineSugg]  = useState<ReturnType<typeof searchAirlines>>([]);
  const [typeSugg,     setTypeSugg]     = useState<ReturnType<typeof searchAircraftTypes>>([]);

  return (
    <motion.div
      layout
      initial={{ opacity:0, scale:0.96 }}
      animate={{ opacity:1, scale:1 }}
      exit={{ opacity:0, scale:0.96 }}
      className="card overflow-hidden">

      {/* Preview */}
      <div className="relative" style={{ aspectRatio:'16/9', background:'#0f172a' }}>
        <img src={photo.preview} alt={photo.reg || photo.file.name}
          className="w-full h-full object-cover" style={{ opacity: photo.status==='error' ? 0.4 : 1 }}/>

        {/* Status badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium"
          style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', color: statusColor }}>
          {photo.status==='validating' && <Loader2 className="w-3 h-3 animate-spin"/>}
          {photo.status==='valid'      && <CheckCircle2 className="w-3 h-3"/>}
          {photo.status==='error'      && <AlertCircle className="w-3 h-3"/>}
          {photo.status==='pending'    && <Camera className="w-3 h-3"/>}
          {photo.reg || '?'}
        </div>

        {/* Remove */}
        <button onClick={() => onRemove(photo.id)}
          className="absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center transition-all"
          style={{ background:'rgba(0,0,0,0.65)', color:'#fff' }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(220,38,38,0.8)'}
          onMouseLeave={e => e.currentTarget.style.background='rgba(0,0,0,0.65)'}>
          <X className="w-3.5 h-3.5"/>
        </button>

        {/* Number */}
        <div className="absolute bottom-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
          style={{ background:'rgba(0,0,0,0.65)', color:'#cbd5e1', backdropFilter:'blur(4px)' }}>
          {index + 1}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        {photo.status === 'error' ? (
          <p className="text-xs py-1" style={{ color:'#dc2626' }}>{photo.error}</p>
        ) : (
          <div className="space-y-1.5">

            {/* No-reg warning + editable reg field */}
            {noReg && (
              <div className="px-2 py-1.5 rounded-lg text-xs" style={{ background:'#fffbeb', border:'1px solid #fde68a' }}>
                <div style={{ color:'#92400e', marginBottom:4 }}>No registration in filename</div>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    defaultValue={photo.reg}
                    placeholder="Enter reg"
                    onBlur={e => {
                      const v = e.target.value.trim().toUpperCase();
                      if (v) { onRegChange(photo.id, v); onRetryLookup(photo.id); }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value.trim().toUpperCase();
                        if (v) { onRegChange(photo.id, v); onRetryLookup(photo.id); }
                      }
                    }}
                    style={{ flex:1, fontSize:11, height:24, fontFamily:'"B612 Mono",monospace',
                      padding:'0 6px', borderRadius:4, border:'1px solid #fcd34d',
                      background:'#fff', color:'#0ea5e9', fontWeight:600 }}
                  />
                  <span className="text-xs" style={{ color:'#d97706' }}>+ Enter</span>
                </div>
              </div>
            )}

            {/* Reg found but no data — manual entry fields */}
            {!noReg && photo.reg && !hasData && photo.status === 'valid' && (
              <div className="rounded-lg overflow-hidden" style={{ border:'1px solid #fde68a' }}>
                <div className="flex items-center justify-between px-2 py-1.5"
                  style={{ background:'#fffbeb' }}>
                  <span className="text-xs" style={{ color:'#92400e' }}>
                    🔍 Not in database — fill manually
                  </span>
                  <button onClick={() => onRetryLookup(photo.id)}
                    className="text-xs" style={{ color:'#d97706', fontWeight:500 }}>
                    Retry
                  </button>
                </div>
                <div className="p-2 space-y-1.5" style={{ background:'#fffef0' }}>
                  {/* Airline autocomplete */}
                  <div>
                    <div className="text-xs mb-0.5" style={{ color:'#94a3b8', fontSize:10, textTransform:'uppercase', letterSpacing:'0.04em' }}>Airline</div>
                    <AutocompleteInput
                      value={photo.manualAirline || ''}
                      onChange={v => {
                        onFieldChange(photo.id, 'manualAirline', v);
                        setAirlineSugg(v.length >= 2 ? searchAirlines(v, 7) : []);
                      }}
                      onSelect={item => {
                        onFieldChange(photo.id, 'manualAirline', item.name);
                        setAirlineSugg([]);
                      }}
                      placeholder="e.g. Qatar Airways"
                      suggestions={airlineSugg}
                      labelKey="name"
                      sublabelKey="iata"
                    />
                  </div>
                  {/* Aircraft Type autocomplete */}
                  <div>
                    <div className="text-xs mb-0.5" style={{ color:'#94a3b8', fontSize:10, textTransform:'uppercase', letterSpacing:'0.04em' }}>Aircraft Type</div>
                    <AutocompleteInput
                      value={photo.manualType || ''}
                      onChange={v => {
                        onFieldChange(photo.id, 'manualType', v);
                        setTypeSugg(v.length >= 2 ? searchAircraftTypes(v, 7) : []);
                      }}
                      onSelect={item => {
                        onFieldChange(photo.id, 'manualType', item.name);
                        setTypeSugg([]);
                      }}
                      placeholder="e.g. A320 or Boeing 777"
                      suggestions={typeSugg}
                      labelKey="name"
                      sublabelKey="manufacturer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Airline — show only if we have DB data (manual handled above) */}
            {(photo.operator || photo.status === 'validating') && (
              <div>
                <div className="text-xs mb-0.5" style={{ color:'#94a3b8', fontSize:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>Airline</div>
                <div className="text-xs font-medium truncate" style={{ color:'#0f172a' }}>
                  {photo.status === 'validating'
                    ? <span style={{ color:'#d97706' }}>Looking up…</span>
                    : photo.operator}
                </div>
              </div>
            )}

            {/* Aircraft Type — show only if we have DB data */}
            {(photo.type || photo.status === 'validating') && (
              <div>
                <div className="text-xs mb-0.5" style={{ color:'#94a3b8', fontSize:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>Aircraft Type</div>
                <div className="text-xs font-medium truncate" style={{ color:'#0f172a' }}>
                  {photo.status === 'validating'
                    ? <span style={{ color:'#d97706' }}>Looking up…</span>
                    : photo.type}
                </div>
              </div>
            )}

            {/* Serial Number */}
            <div>
              <div className="text-xs mb-0.5" style={{ color:'#94a3b8', fontSize:10, letterSpacing:'0.04em', textTransform:'uppercase' }}>Serial Number</div>
              <input
                type="text"
                value={photo.msn}
                onChange={e => onMsnChange(photo.id, e.target.value)}
                placeholder="e.g. 40639"
                style={{ fontSize:12, height:28, fontFamily:'"B612 Mono",monospace', letterSpacing:'0.03em', padding:'0 8px' }}
              />
            </div>

          </div>
        )}

        {/* File info */}
        <div className="flex items-center justify-between pt-1" style={{ borderTop:'1px solid #f1f5f9' }}>
          <span className="text-xs" style={{ color:'#94a3b8', fontFamily:'"B612 Mono",monospace' }}>
            {(photo.file.size / 1024).toFixed(0)} KB
          </span>
          <span className="text-xs truncate ml-2" style={{ color:'#cbd5e1', fontFamily:'"B612 Mono",monospace', maxWidth:100 }}>
            {photo.file.name.replace(/^.*[\/\\]/, '').slice(-14)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ── Main component ────────────────────────────────────────
export const UploadPage = ({ onNavigate }: { onNavigate?: (page: string) => void }) => {
  // ── Aircraft Data block ──────────────────────────────────
  const [acReg,       setAcReg]       = useState('');
  const [acAirline,   setAcAirline]   = useState('');
  const [acType,      setAcType]      = useState('');
  const [acSerial,      setAcSerial]      = useState('');
  const [acFirstFlight, setAcFirstFlight] = useState('');
  const [acEngines,     setAcEngines]     = useState('');
  const [acConfig,      setAcConfig]      = useState('');
  const [acStatus,      setAcStatus]      = useState('');
  const [acOptionalOpen, setAcOptionalOpen] = useState(false);
  const [acLookup,    setAcLookup]    = useState<'idle'|'loading'|'found'|'notfound'>('idle');
  const [acAirlineSugg, setAcAirlineSugg] = useState<ReturnType<typeof searchAirlines>>([]);
  const [acTypeSugg,    setAcTypeSugg]    = useState<ReturnType<typeof searchAircraftTypes>>([]);

  // debounce timer
  const acTimer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const triggerLookup = (reg: string) => {
    if (acTimer.current) clearTimeout(acTimer.current);
    if (reg.length < 3) { setAcLookup('idle'); setAcAirline(''); setAcType(''); return; }
    setAcLookup('loading');
    acTimer.current = setTimeout(async () => {
      const data = await lookupAircraft(reg);
      if (data) {
        setAcAirline(data.operator);
        setAcType(data.typeName);
        // Auto-fill optional fields only if Supabase returned them
        if (data.msn)         setAcSerial(data.msn);
        if (data.firstFlight) setAcFirstFlight(data.firstFlight);
        if (data.seatConfig)  setAcConfig(data.seatConfig);
        if (data.engines)     setAcEngines(data.engines);
        if (data.status)      setAcStatus(data.status);
        // Open optional section automatically if it has data
        if (data.msn || data.firstFlight || data.seatConfig || data.engines) {
          setAcOptionalOpen(true);
        }
        setAcAirlineSugg([]);
        setAcTypeSugg([]);
        setAcLookup('found');
      } else {
        setAcAirline(''); setAcType('');
        setAcAirlineSugg([]); setAcTypeSugg([]);
        setAcLookup('notfound');
      }
    }, 600);
  };

  const [photos,      setPhotos]      = useState<PhotoFile[]>([]);
  const [country,     setCountry]     = useState('');
  const [airport,     setAirport]     = useState('');
  const [shotDate,    setShotDate]    = useState('');
  const [categories,  setCategories]  = useState<string[]>([]);
  const [notes,       setNotes]       = useState('');
  const [apSugg,      setApSugg]      = useState<Airport[]>([]);
  const [apQuery,     setApQuery]     = useState('');
  const [dragOver,    setDragOver]    = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Process dropped/selected files ──────────────────────
  const processFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    const remaining  = MAX_FILES - photos.length;
    const toProcess  = imageFiles.slice(0, remaining);
    if (!toProcess.length) return;

    // Add as pending immediately with previews
    const newPhotos: PhotoFile[] = toProcess.map(file => ({
      id:       Math.random().toString(36).slice(2),
      file,
      preview:  URL.createObjectURL(file),
      status:   'validating' as FileStatus,
      reg:      extractRegFromFilename(file.name),
      type:     '',
      mfr:      '',
      operator: '',
      msn:      '',
    }));

    setPhotos(prev => [...prev, ...newPhotos]);

    // 1. Validate all images in parallel
    const validations = await Promise.all(
      newPhotos.map(np => validateImage(np.file).then(v => ({ id: np.id, ...v })))
    );
    for (const v of validations) {
      if (!v.ok) {
        setPhotos(prev => prev.map(p => p.id === v.id
          ? { ...p, status:'error', error: v.error }
          : p));
      }
    }

    // 2. Batch lookup all registrations in parallel
    const validPhotos = newPhotos.filter(np => {
      const v = validations.find(val => val.id === np.id);
      return v?.ok && np.reg;
    });
    const regsToLookup = validPhotos.map(p => p.reg).filter(Boolean);

    if (regsToLookup.length > 0) {
      const lookupResults = await lookupAircraftBatch(regsToLookup);
      setPhotos(prev => prev.map(p => {
        const regKey = (p.reg || '').trim().toUpperCase().replace(/\s+/g, '');
        const result = lookupResults.get(regKey);
        if (result) {
          const msnFromDb = (result.msn || '').trim();
          return {
            ...p,
            status:   'valid',
            type:     result.typeName   || '',
            mfr:      result.manufacturer || '',
            operator: result.operator   || '',
            msn:      msnFromDb || p.msn,
          };
        }
        const v = validations.find(val => val.id === p.id);
        if (v?.ok && newPhotos.some(np => np.id === p.id)) {
          return { ...p, status:'valid' };
        }
        return p;
      }));
    } else {
      setPhotos(prev => prev.map(p => {
        const v = validations.find(val => val.id === p.id);
        if (v?.ok && newPhotos.some(np => np.id === p.id)) {
          return { ...p, status:'valid' };
        }
        return p;
      }));
    }
  }, [photos.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
    e.target.value = '';
  }, [processFiles]);

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const p = prev.find(x => x.id === id);
      if (p) URL.revokeObjectURL(p.preview);
      return prev.filter(x => x.id !== id);
    });
  };

  const updateMsn = (id: string, msn: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, msn } : p));
  };

  const updateReg = (id: string, reg: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, reg } : p));
  };

  const updateField = (id: string, field: 'manualAirline' | 'manualType', value: string) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const retryLookup = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo || !photo.reg) return;
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, status:'validating' } : p));
    const data = await lookupByReg(photo.reg);
    setPhotos(prev => prev.map(p => p.id === id
      ? {
          ...p,
          status:   'valid',
          type:     data?.type     || '',
          mfr:      data?.mfr      || '',
          operator: data?.operator || '',
          msn:      data?.msn?.trim() || p.msn,
        }
      : p));
  };

  const onCountryChange = (c: string) => {
    setCountry(c);
    setAirport('');
    setApQuery('');
    setApSugg(c ? airportsByCountry(c) : []);
  };

  const onApChange = (v: string) => {
    const upper = v.toUpperCase();
    setAirport(upper);
    setApQuery(v);
    // Reset country when user types manually — it will be set again on selection
    setCountry('');
    if (!v) {
      setApSugg([]);
    } else {
      setApSugg(searchAirports(v, 10));
    }
  };

  const selectCategory = (cat: string) => {
    setCategories(prev => prev[0] === cat ? [] : [cat]);
  };

  // ── Stats ────────────────────────────────────────────────
  const validPhotos   = photos.filter(p => p.status === 'valid');
  const errorPhotos   = photos.filter(p => p.status === 'error');
  const pendingCount  = photos.filter(p => p.status === 'validating' || p.status === 'pending').length;
  const withData      = validPhotos.filter(p => p.operator || p.type);
  const withoutData   = validPhotos.filter(p => !p.operator && !p.type && p.reg);
  const withoutReg    = validPhotos.filter(p => !p.reg);
  const batchDone     = photos.length > 0 && pendingCount === 0;
  const canSubmit    = validPhotos.length > 0 && airport && shotDate && categories.length > 0 && !pendingCount;

  // ── Score ────────────────────────────────────────────────
  const score = Math.min(100, Math.round(
    (validPhotos.length > 0 ? 25 : 0) +
    (airport   ? 20 : 0) +
    (shotDate  ? 20 : 0) +
    (categories.length > 0 ? 20 : 0) +
    (validPhotos.some(p => p.msn) ? 15 : 0)
  ));
  const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Incomplete';

  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const user = await getCurrentUser();
      if (!user) {
        setSubmitError('You must be signed in to upload photos.');
        setSubmitting(false);
        return;
      }

      if (acReg && (acSerial || acFirstFlight || acConfig || acEngines || acStatus)) {
        await contributeAircraftData({
          registration: acReg,
          msn:          acSerial      || undefined,
          firstFlight:  acFirstFlight || undefined,
          seatConfig:   acConfig      || undefined,
          engines:      acEngines     || undefined,
          status:       acStatus      || undefined,
        });
      }

      let airportId: string | null = null;
      if (airport) {
        const { data: ap } = await supabase
          .from('airports')
          .select('id')
          .ilike('iata', airport)
          .single();
        airportId = ap?.id ?? null;
      }

      for (const photo of validPhotos) {
        const reg = photo.reg || acReg;
        if (!reg) continue;

        const operatorName =
          (photo.operator?.trim() ||
            photo.manualAirline?.trim() ||
            acAirline?.trim() ||
            '') || '';
        const typeLabel = (photo.type?.trim() || photo.manualType?.trim() || '') || '';
        const mfrLabel =
          photo.mfr?.trim() ||
          (photo.manualType?.trim()
            ? searchAircraftTypes(photo.manualType.trim(), 1)[0]?.manufacturer || ''
            : '');
        const operatorId = await resolveOperatorId(supabase, operatorName || null);
        const typeId = await resolveAircraftTypeId(supabase, typeLabel || null, mfrLabel || null);

        const uploaded = await uploadPhoto(photo.file, reg);

        const headSame =
          !!acReg.trim() && normRegKey(reg) === normRegKey(acReg.trim());
        const detailPatch = aircraftHeadDetailsPatch(
          headSame,
          photo,
          acSerial,
          acFirstFlight,
          acConfig,
          acEngines,
          acStatus,
        );

        let { data: aircraft } = await supabase
          .from('aircraft')
          .select('id, type_id')
          .eq('registration', reg.toUpperCase())
          .maybeSingle();

        if (!aircraft) {
          const { data: newAc } = await supabase
            .from('aircraft')
            .insert({
              registration: reg.toUpperCase(),
              created_by:   user.id,
              type_id:      typeId,
              ...detailPatch,
            })
            .select('id, type_id')
            .single();
          aircraft = newAc;
        } else {
          const patch: Record<string, unknown> = { ...detailPatch };
          if (typeId && !aircraft.type_id) patch.type_id = typeId;
          if (Object.keys(patch).length) {
            await supabase.from('aircraft').update(patch).eq('id', aircraft.id);
          }
        }
        if (!aircraft) continue;

        const categoryVal = (categories[0] || 'OTHER').toUpperCase().replace(/-/g, '_').replace(/\s/g, '_');

        await supabase
          .from('photos')
          .insert({
            aircraft_id:  aircraft.id,
            uploader_id:  user.id,
            operator_id:  operatorId,
            airport_id:   airportId,
            shot_date:    shotDate,
            category:     categoryVal as any,
            livery_notes: null,
            notes:        notes || null,
            storage_path: uploaded.path,
            file_size_kb: Math.round(photo.file.size / 1024),
            status:       'PENDING' as any,
          });
      }

      setSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Upload error:', err);
      setSubmitError(err?.message || 'Something went wrong during upload.');
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────────────────
  if (submitted) return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      className="min-h-[70vh] flex items-center justify-center px-8">
      <div className="text-center max-w-sm">
        <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ delay:0.15, type:'spring' }}
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ background:'#f0fdf4', border:'2px solid #bbf7d0' }}>
          <CheckCircle2 className="w-10 h-10" style={{ color:'#16a34a' }}/>
        </motion.div>
        <h2 className="font-headline text-3xl font-bold mb-3 tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>
          {validPhotos.length} {validPhotos.length === 1 ? 'photo' : 'photos'} submitted
        </h2>
        <p className="text-sm mb-2 leading-relaxed" style={{ color:'#475569' }}>
          All photos are now in the moderation queue. Check your profile to track their status.
        </p>
        <p className="text-xs mb-8" style={{ color:'#94a3b8', fontFamily:'"B612 Mono",monospace' }}>
          {airport} · {shotDate}
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={() => { setSubmitted(false); setPhotos([]); setCountry(''); setAirport(''); setShotDate(''); setCategories([]); setNotes(''); }}
            className="btn-primary w-full justify-center" style={{ height:44, fontSize:14 }}>
            Upload more photos
          </button>
          <button onClick={() => onNavigate?.('profile')}
            className="btn-outline w-full justify-center" style={{ height:44, fontSize:14 }}>
            View my submissions
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ background:'#fff', minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
        <div className="site-w py-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide mb-1.5"
              style={{ color:'#94a3b8', letterSpacing:'0.05em', fontSize:11 }}>Contribute</div>
            <h1 className="font-headline text-4xl font-bold tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>
              Upload Photos
            </h1>
            <p className="text-sm mt-1" style={{ color:'#475569' }}>
              Drop up to {MAX_FILES} photos — filenames should include the registration (e.g. <span style={{ fontFamily:'"B612 Mono",monospace' }}>A6-EVB.jpg</span>)
            </p>
          </div>

          {/* Score ring */}
          <div className="flex items-center gap-4 px-5 py-3.5 rounded-2xl"
            style={{ background:'#fff', border:'1px solid #e2e8f0' }}>
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="20" fill="none" stroke="#f1f5f9" strokeWidth="4"/>
                <circle cx="28" cy="28" r="20" fill="none" stroke={scoreColor} strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${2*Math.PI*20}`}
                  strokeDashoffset={`${2*Math.PI*20*(1-score/100)}`}
                  style={{ transition:'stroke-dashoffset 0.4s,stroke 0.3s' }}/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-semibold" style={{ color:scoreColor, fontFamily:'"B612 Mono",monospace' }}>{score}</span>
              </div>
            </div>
            <div>
              <div className="text-xs mb-0.5" style={{ color:'#94a3b8' }}>Batch score</div>
              <div className="text-sm font-semibold" style={{ color:scoreColor }}>{scoreLabel}</div>
              <div className="text-xs" style={{ color:'#94a3b8' }}>
                {validPhotos.length}/{MAX_FILES} valid
                {errorPhotos.length > 0 && <span style={{ color:'#dc2626' }}> · {errorPhotos.length} error</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-w py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* ── LEFT: Drop zone + photo grid ── */}
          <div className="lg:col-span-7 space-y-5">

            {/* Acceptance criteria */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" style={{ color:'#94a3b8' }}/>
                <span className="text-sm font-medium" style={{ color:'#0f172a' }}>Acceptance criteria</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {[
                  `JPEG format only (.jpg / .jpeg)`,
                  `Filename must contain registration (A6-EVB.jpg)`,
                  `Minimum file size: ${MIN_SIZE_KB} KB`,
                  `Maximum width: ${MAX_WIDTH_PX} px`,
                  'Aircraft must be clearly visible and in focus',
                  'No heavy watermarks or digital signatures',
                ].map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs" style={{ color:'#475569' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color:'#34c759' }}/>
                    {r}
                  </div>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div
              className="rounded-2xl cursor-pointer transition-all"
              style={{
                border:      dragOver ? '2px dashed #0ea5e9' : '2px dashed #e2e8f0',
                background:  dragOver ? 'rgba(14,165,233,0.03)' : '#f8fafc',
                padding:     '40px 24px',
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => photos.length < MAX_FILES && fileRef.current?.click()}>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/jpg,.jpg,.jpeg"
                multiple
                className="hidden"
                onChange={handleFileInput}
              />

              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: dragOver ? 'rgba(14,165,233,0.1)' : '#fff', border:'1px solid #e2e8f0' }}>
                  <ImagePlus className="w-6 h-6" style={{ color: dragOver ? '#0ea5e9' : '#94a3b8' }}/>
                </div>
                <h3 className="font-semibold text-base mb-1" style={{ color:'#0f172a' }}>
                  {dragOver ? 'Drop photos here' : photos.length === 0 ? 'Drag & drop photos' : `Add more (${MAX_FILES - photos.length} remaining)`}
                </h3>
                <p className="text-sm mb-4" style={{ color:'#94a3b8' }}>
                  JPEG only &nbsp;·&nbsp; min {MIN_SIZE_KB} KB &nbsp;·&nbsp; max width {MAX_WIDTH_PX}px
                </p>
                {photos.length < MAX_FILES && (
                  <button className="btn-outline" style={{ height:36, padding:'0 20px', fontSize:13 }}
                    onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}>
                    Browse files
                  </button>
                )}
                {photos.length >= MAX_FILES && (
                  <p className="text-xs font-medium" style={{ color:'#d97706' }}>
                    Maximum {MAX_FILES} photos per batch reached
                  </p>
                )}
              </div>
            </div>

            {/* Batch summary — shows after processing completes */}
            {batchDone && photos.length >= 3 && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                className="rounded-xl p-4" style={{ background:'#f8fafc', border:'1px solid #e2e8f0' }}>
                <div className="text-xs font-semibold uppercase mb-3" style={{ color:'#64748b', letterSpacing:'0.05em' }}>Batch summary</div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="rounded-lg p-2" style={{ background:'#f0fdf4', border:'1px solid #bbf7d0' }}>
                    <div className="text-lg font-bold" style={{ color:'#16a34a' }}>{withData.length}</div>
                    <div className="text-xs" style={{ color:'#16a34a' }}>Auto-filled</div>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: withoutData.length > 0 ? '#fffbeb' : '#f8fafc', border:'1px solid ' + (withoutData.length > 0 ? '#fde68a' : '#e2e8f0') }}>
                    <div className="text-lg font-bold" style={{ color: withoutData.length > 0 ? '#d97706' : '#94a3b8' }}>{withoutData.length}</div>
                    <div className="text-xs" style={{ color: withoutData.length > 0 ? '#d97706' : '#94a3b8' }}>Not in DB</div>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: withoutReg.length > 0 ? '#fef2f2' : '#f8fafc', border:'1px solid ' + (withoutReg.length > 0 ? '#fecaca' : '#e2e8f0') }}>
                    <div className="text-lg font-bold" style={{ color: withoutReg.length > 0 ? '#dc2626' : '#94a3b8' }}>{withoutReg.length}</div>
                    <div className="text-xs" style={{ color: withoutReg.length > 0 ? '#dc2626' : '#94a3b8' }}>No reg</div>
                  </div>
                  <div className="rounded-lg p-2" style={{ background: errorPhotos.length > 0 ? '#fef2f2' : '#f8fafc', border:'1px solid ' + (errorPhotos.length > 0 ? '#fecaca' : '#e2e8f0') }}>
                    <div className="text-lg font-bold" style={{ color: errorPhotos.length > 0 ? '#dc2626' : '#94a3b8' }}>{errorPhotos.length}</div>
                    <div className="text-xs" style={{ color: errorPhotos.length > 0 ? '#dc2626' : '#94a3b8' }}>Errors</div>
                  </div>
                </div>
                {(withoutData.length > 0 || withoutReg.length > 0) && (
                  <div className="mt-3 text-xs" style={{ color:'#64748b', lineHeight:1.6 }}>
                    {withoutReg.length > 0 && <span>⚠️ {withoutReg.length} photo{withoutReg.length > 1 ? 's' : ''} without registration — add reg in the card to auto-fill data. </span>}
                    {withoutData.length > 0 && <span>🔍 {withoutData.length} reg{withoutData.length > 1 ? 's' : ''} not found in database — fill manually or check spelling.</span>}
                  </div>
                )}
              </motion.div>
            )}

            {/* Photo grid */}
            {photos.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium" style={{ color:'#0f172a' }}>
                    {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
                  </span>
                  <button onClick={() => { photos.forEach(p => URL.revokeObjectURL(p.preview)); setPhotos([]); }}
                    className="flex items-center gap-1.5 text-xs transition-colors"
                    style={{ color:'#94a3b8' }}
                    onMouseEnter={e => e.currentTarget.style.color='#dc2626'}
                    onMouseLeave={e => e.currentTarget.style.color='#94a3b8'}>
                    <Trash2 className="w-3.5 h-3.5"/>Clear all
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <AnimatePresence>
                    {photos.map((p, i) => (
                      <PhotoCard
                        key={p.id}
                        photo={p}
                        index={i}
                        onRemove={removePhoto}
                        onMsnChange={updateMsn}
                        onRegChange={updateReg}
                        onRetryLookup={retryLookup}
                        onFieldChange={updateField}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Aircraft Data + Shot details + submit ── */}
          <div className="lg:col-span-5 space-y-5">

            {/* Aircraft Data */}
            <div className="card p-6">
              <h3 className="text-base font-bold mb-1 tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>
                Aircraft Data
              </h3>
              <div className="mb-4" style={{ height:1, background:'#e2e8f0', marginTop:12 }}/>

              {/* Registration — auto-lookup on type */}
              <div className="mb-4">
                <label className="text-xs font-medium uppercase tracking-wide block mb-1.5"
                  style={{ color:'#94a3b8', letterSpacing:'0.05em', fontSize:11 }}>Aircraft Registration</label>
                <div className="relative">
                  <input
                    type="text"
                    value={acReg}
                    onChange={e => {
                      const v = e.target.value.toUpperCase();
                      setAcReg(v);
                      triggerLookup(v.trim());
                    }}
                    placeholder="e.g. A6-EVB"
                    style={{
                      fontFamily:'"B612 Mono",monospace', letterSpacing:'0.06em', fontWeight:600,
                      color: acReg ? '#0ea5e9' : undefined,
                      paddingRight: acLookup === 'loading' ? 36 : undefined,
                    }}
                  />
                  {acLookup === 'loading' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color:'#d97706' }}/>
                  )}
                  {acLookup === 'found' && (
                    <CheckCircle2 className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color:'#16a34a' }}/>
                  )}
                </div>
              </div>

              {/* ── Auto-filled fields ─────────────────── */}
              <div className="space-y-3 pb-4" style={{ borderBottom:'1px solid #f1f5f9' }}>
                <div className="text-xs font-semibold uppercase" style={{ color:'#94a3b8', letterSpacing:'0.06em' }}>Auto-filled from database</div>

                {/* Airline */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm shrink-0" style={{ color:'#64748b' }}>Airline</span>
                  <div className="text-sm font-medium" style={{ color: acAirline ? '#0f172a' : '#cbd5e1' }}>
                    {acLookup === 'loading'
                      ? <span style={{ color:'#d97706', fontSize:12 }}>Looking up…</span>
                      : acLookup === 'notfound'
                      ? <span style={{ color:'#94a3b8', fontSize:12, fontStyle:'italic' }}>Not found</span>
                      : acAirline || <span style={{ color:'#e2e8f0' }}>—</span>}
                  </div>
                </div>

                {/* Aircraft Type */}
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm shrink-0" style={{ color:'#64748b' }}>Aircraft Type</span>
                  <div className="text-sm font-medium" style={{ color: acType ? '#0f172a' : '#cbd5e1' }}>
                    {acLookup === 'loading'
                      ? <span style={{ color:'#d97706', fontSize:12 }}>Looking up…</span>
                      : acLookup === 'notfound'
                      ? <span style={{ color:'#94a3b8', fontSize:12, fontStyle:'italic' }}>Not found</span>
                      : acType || <span style={{ color:'#e2e8f0' }}>—</span>}
                  </div>
                </div>
              </div>

              {/* ── Status — important, always visible ─── */}
              <div className="flex items-center justify-between gap-4 py-3" style={{ borderBottom:'1px solid #f1f5f9' }}>
                <span className="text-sm shrink-0" style={{ color:'#64748b' }}>Status</span>
                <div className="flex gap-1.5">
                  {(['Active','Stored','Scrapped'] as const).map(s => (
                    <button key={s} onClick={() => setAcStatus(acStatus === s ? '' : s)}
                      style={{
                        height:30, padding:'0 11px', fontSize:11, borderRadius:7, cursor:'pointer',
                        fontWeight: acStatus === s ? 600 : 400,
                        background: acStatus === s
                          ? (s==='Active' ? '#f0fdf4' : s==='Stored' ? '#fffbeb' : '#fef2f2')
                          : '#f8fafc',
                        color: acStatus === s
                          ? (s==='Active' ? '#16a34a' : s==='Stored' ? '#d97706' : '#dc2626')
                          : '#94a3b8',
                        border: '1px solid ' + (acStatus === s
                          ? (s==='Active' ? '#bbf7d0' : s==='Stored' ? '#fde68a' : '#fecaca')
                          : '#e2e8f0'),
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Optional fields — collapsible ───────── */}
              <div className="pt-1">
                <button
                  onClick={() => setAcOptionalOpen(v => !v)}
                  className="flex items-center gap-2 w-full py-2"
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
                  <ChevronDown className="w-3.5 h-3.5 transition-transform" style={{ transform: acOptionalOpen ? 'rotate(180deg)' : 'none' }}/>
                  <span className="text-xs font-semibold uppercase" style={{ letterSpacing:'0.06em' }}>Optional details</span>
                  {(acSerial || acFirstFlight || acEngines || acConfig) && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
                      style={{ background:'#f0f9ff', color:'#0ea5e9', fontWeight:600 }}>
                      {[acSerial,acFirstFlight,acEngines,acConfig].filter(Boolean).length} filled
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {acOptionalOpen && (
                    <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
                      exit={{ height:0, opacity:0 }} transition={{ duration:0.15 }}
                      style={{ overflow:'hidden' }}>
                      <div className="space-y-3 pt-1 pb-2">

                        {/* Serial Number */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm shrink-0" style={{ color:'#64748b' }}>MSN</span>
                          <input type="text" value={acSerial} onChange={e => setAcSerial(e.target.value)}
                            placeholder="e.g. 40639"
                            style={{ width:160, fontSize:13, height:32,
                              fontFamily:'"B612 Mono",monospace', letterSpacing:'0.03em',
                              padding:'0 10px', textAlign:'right' }}/>
                        </div>

                        {/* First Flight */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm shrink-0" style={{ color:'#64748b' }}>First Flight</span>
                          <input type="text" value={acFirstFlight}
                            onChange={e => {
                              let v = e.target.value.replace(/[^0-9]/g,'');
                              if (v.length>4) v=v.slice(0,4)+'-'+v.slice(4);
                              if (v.length>7) v=v.slice(0,7)+'-'+v.slice(7);
                              setAcFirstFlight(v.slice(0,10));
                            }}
                            placeholder="YYYY-MM-DD" maxLength={10}
                            style={{ width:160, fontSize:13, height:32,
                              fontFamily:'"B612 Mono",monospace', letterSpacing:'0.03em',
                              padding:'0 10px', textAlign:'right' }}/>
                        </div>

                        {/* Config */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm shrink-0" style={{ color:'#64748b' }}>Config</span>
                          <input type="text" value={acConfig}
                            onChange={e => setAcConfig(e.target.value.toUpperCase())}
                            placeholder="e.g. C8 Y150"
                            style={{ width:160, fontSize:13, height:32,
                              fontFamily:'"B612 Mono",monospace', letterSpacing:'0.03em',
                              padding:'0 10px', textAlign:'right' }}/>
                        </div>

                        {/* Engines */}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm shrink-0" style={{ color:'#64748b' }}>Engines</span>
                          <input type="text" value={acEngines} onChange={e => setAcEngines(e.target.value)}
                            placeholder="e.g. 2× CFM56-5B4"
                            style={{ width:160, fontSize:12, height:32,
                              padding:'0 10px', textAlign:'right' }}/>
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Not found — show manual autocomplete inputs */}
              {acLookup === 'notfound' && (
                <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                  className="mt-2 rounded-xl overflow-hidden"
                  style={{ border:'1px solid #fde68a' }}>
                  <div className="px-3 py-2 text-xs" style={{ background:'#fffbeb', color:'#92400e' }}>
                    <span style={{ fontFamily:'"B612 Mono",monospace', fontWeight:700 }}>{acReg}</span>{' '}
                    not found — fill in manually below
                  </div>
                  <div className="p-3 space-y-3" style={{ background:'#fff' }}>
                    <div>
                      <label className="text-xs font-medium uppercase block mb-1"
                        style={{ color:'#94a3b8', letterSpacing:'0.04em', fontSize:10 }}>Airline</label>
                      <AutocompleteInput
                        value={acAirline}
                        onChange={v => {
                          setAcAirline(v);
                          setAcAirlineSugg(v.length >= 1 ? searchAirlines(v, 7) : []);
                        }}
                        onSelect={item => { setAcAirline(item.name); setAcAirlineSugg([]); }}
                        placeholder="Start typing airline name…"
                        suggestions={acAirlineSugg}
                        labelKey="name"
                        sublabelKey="iata"
                        minChars={1}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium uppercase block mb-1"
                        style={{ color:'#94a3b8', letterSpacing:'0.04em', fontSize:10 }}>Aircraft Type</label>
                      <AutocompleteInput
                        value={acType}
                        onChange={v => {
                          setAcType(v);
                          setAcTypeSugg(v.length >= 2 ? searchAircraftTypes(v, 7) : []);
                        }}
                        onSelect={item => { setAcType(item.name); setAcTypeSugg([]); }}
                        placeholder="e.g. A320 or Boeing 777…"
                        suggestions={acTypeSugg}
                        labelKey="name"
                        sublabelKey="manufacturer"
                        minChars={2}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Shot details */}
            <div className="card p-6">
              <h3 className="text-base font-bold mb-5 tracking-tight" style={{ color:'#0f172a', letterSpacing:'-0.01em' }}>
                Shot Details
              </h3>
              <div className="space-y-4">

                {/* Country */}
                <Field label="Country">
                  <div className="relative">
                    <select
                      value={country}
                      onChange={e => onCountryChange(e.target.value)}
                      style={{ appearance:'none', paddingRight:32 }}>
                      <option value="">All countries…</option>
                      {COUNTRIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color:'#94a3b8' }}/>
                  </div>
                </Field>

                {/* Airport */}
                <Field label="Airport (IATA)" required>
                  <div className="relative">
                    <input
                      type="text"
                      value={airport}
                      onChange={e => onApChange(e.target.value)}
                      onKeyDown={e => {
                        if ((e.key === 'Enter' || e.key === 'Tab') && apQuery.length >= 2 && apSugg.length === 0) {
                          e.preventDefault();
                          setApQuery('');
                          setApSugg([]);
                        }
                      }}
                      placeholder="e.g. TAS"
                      style={{ fontFamily:'"B612 Mono",monospace', letterSpacing:'0.04em' }}
                    />
                    <AnimatePresence>
                      {apSugg.length > 0 && (
                        <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20"
                          style={{ background:'#fff', border:'1px solid #e2e8f0', boxShadow:'0 8px 24px rgba(0,0,0,0.1)', maxHeight:280, overflowY:'auto' }}>
                          {apSugg.map(a => (
                          <button key={a.iata}
                          onClick={() => { setAirport(a.iata); setCountry(a.country); setApQuery(''); setApSugg([]); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{ borderBottom:'1px solid #f5f5f7' }}
                          onMouseEnter={e => e.currentTarget.style.background='#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <span style={{ fontSize:16 }}>{a.flag}</span>
                          <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold" style={{ color:'#0ea5e9', fontFamily:'"B612 Mono",monospace' }}>{a.iata}</span>
                              <span className="text-sm font-medium truncate" style={{ color:'#0f172a' }}>{a.city}</span>
                              </div>
                                <div className="text-xs truncate" style={{ color:'#94a3b8' }}>{a.country} · {a.name}</div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                      {/* Not found hint */}
                      {apSugg.length === 0 && apQuery.length >= 2 && (
                        <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                          className="absolute top-full left-0 right-0 mt-1 rounded-xl z-20"
                          style={{ background:'#f8fafc', border:'1px solid #e2e8f0', overflow:'hidden' }}>
                          <div className="px-4 py-3 text-xs" style={{ color:'#64748b', lineHeight:1.6 }}>
                            <span style={{ fontFamily:'"B612 Mono",monospace', color:'#0ea5e9', fontWeight:700 }}>{airport}</span>{' '}
                            not in our database — but you can use it.
                          </div>
                          <div className="flex border-t" style={{ borderColor:'#e2e8f0' }}>
                            <button
                              onClick={() => { setApQuery(''); setApSugg([]); }}
                              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                              style={{ color:'#0ea5e9' }}
                              onMouseEnter={e => e.currentTarget.style.background='#f0f9ff'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                              ✓ Use {airport}
                            </button>
                            <div style={{ width:1, background:'#e2e8f0' }}/>
                            <a
                              href="https://www.iata.org/en/publications/directories/code-search/"
                              target="_blank" rel="noopener noreferrer"
                              className="flex-1 py-2.5 text-xs text-center transition-colors"
                              style={{ color:'#94a3b8', display:'block' }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#f8fafc'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}>
                              Look up ↗
                            </a>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Field>

                {/* Date — text input to avoid Cyrillic locale in Chrome */}
                <Field label="Date of Photography" required>
                  <input
                    type="text"
                    value={shotDate}
                    placeholder="YYYY-MM-DD"
                    maxLength={10}
                    onChange={e => {
                      // Auto-insert dashes: 2025 → 2025- → 2025-07- → 2025-07-14
                      let v = e.target.value.replace(/[^0-9]/g, '');
                      if (v.length > 4)  v = v.slice(0,4) + '-' + v.slice(4);
                      if (v.length > 7)  v = v.slice(0,7) + '-' + v.slice(7);
                      setShotDate(v.slice(0,10));
                    }}
                    style={{ fontFamily: '"B612 Mono", monospace', letterSpacing: '0.04em' }}
                  />
                </Field>

                {/* Category — single select */}
                <Field label="Photo Category" required>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const selected = categories[0] === cat;
                      return (
                        <button key={cat} type="button"
                          onClick={() => selectCategory(cat)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-left"
                          style={{
                            background: selected ? '#f0f9ff' : '#f8fafc',
                            border: '1px solid ' + (selected ? '#0ea5e9' : '#e2e8f0'),
                          }}>
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                            style={{
                              background: selected ? '#0ea5e9' : '#fff',
                              border: '1.5px solid ' + (selected ? '#0ea5e9' : '#d1d5db'),
                            }}>
                            {selected && <div className="w-2 h-2 rounded-full" style={{ background: '#fff' }} />}
                          </div>
                          <span className="text-sm" style={{ color: selected ? '#0284c7' : '#475569', fontWeight: selected ? 500 : 400 }}>
                            {cat}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Notes */}
                <Field label="Notes (optional)">
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Special occasion, rare livery, event details…"
                    rows={2}
                    style={{ resize:'vertical', fontSize:13 }}
                  />
                </Field>
              </div>
            </div>

            {/* Validation summary */}
            {photos.length > 0 && (
              <div className="space-y-2">
                {pendingCount > 0 && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm"
                    style={{ background:'#fffbeb', border:'1px solid #fde68a', color:'#d97706' }}>
                    <Loader2 className="w-4 h-4 animate-spin shrink-0"/>
                    Validating {pendingCount} photo{pendingCount !== 1 ? 's' : ''}…
                  </div>
                )}
                {errorPhotos.length > 0 && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
                    style={{ background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626' }}>
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0"/>
                    {errorPhotos.length} photo{errorPhotos.length !== 1 ? 's' : ''} failed validation — remove them to continue.
                  </div>
                )}
                {validPhotos.length > 0 && !pendingCount && (
                  <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm"
                    style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#16a34a' }}>
                    <CheckCircle2 className="w-4 h-4 shrink-0"/>
                    {validPhotos.length} photo{validPhotos.length !== 1 ? 's' : ''} ready to submit.
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="card p-5">
              {submitError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs"
                  style={{ background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/>{submitError}
                </div>
              )}
              {(!airport || !shotDate || categories.length === 0) && photos.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl mb-4 text-xs"
                  style={{ background:'#fef2f2', color:'#dc2626' }}>
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0"/>
                  Missing: {[!airport&&'Airport',!shotDate&&'Date',categories.length===0&&'Category'].filter(Boolean).join(', ')}
                </div>
              )}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs" style={{ color:'#94a3b8' }}>
                  {validPhotos.length > 0
                    ? <span style={{ color:'#0f172a', fontFamily:'"B612 Mono",monospace', fontWeight:500 }}>{validPhotos.length}</span>
                    : '0'} photo{validPhotos.length !== 1 ? 's' : ''} will be submitted
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="btn-primary flex items-center gap-2"
                  style={{ height:42, padding:'0 24px', fontSize:13, opacity: canSubmit ? 1 : 0.4, cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin"/>Submitting…</>
                  ) : (
                    <>Submit {validPhotos.length > 0 ? validPhotos.length : ''} photo{validPhotos.length !== 1 ? 's' : ''}<ArrowRight className="w-4 h-4"/></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
