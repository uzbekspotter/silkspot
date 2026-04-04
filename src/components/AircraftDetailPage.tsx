import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Heart, Eye, Share2, X, ChevronLeft, ChevronRight,
  ArrowLeft, Loader2, AlertCircle, Pencil,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { searchAircraftTypes, searchAirlines } from '../aviation-data';
import { supabase } from '../lib/supabase';
import { proxyImageUrl } from '../lib/storage';
import { contributeAircraftData } from '../aircraft-lookup';
import { resolveAircraftTypeId, resolveOperatorId } from '../lib/upload-helpers';
import { PhotoStarDisplay } from './PhotoStarRating';

type DbStatus = 'ACTIVE' | 'STORED' | 'SCRAPPED' | 'WFU' | 'PRESERVED';
type Tab = 'Overview' | 'Gallery' | 'History' | 'Similar';

export interface AircraftDetailPageProps {
  registration: string | null;
  /** Switch to another registration without leaving the page (e.g. Similar list). */
  onOpenRegistration?: (registration: string) => void;
  onBack: () => void;
  appUserId: string | null;
  isStaff: boolean;
}

function asSingular<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}

type AcRow = {
  id: string;
  registration: string;
  msn: string | null;
  line_number: string | null;
  icao_hex: string | null;
  selcal: string | null;
  year_built: number | null;
  first_flight: string | null;
  status: DbStatus;
  photo_count: number;
  view_count: number;
  like_count: number;
  created_by: string | null;
  type_id: string | null;
  seat_config: string | null;
  engines: string | null;
  home_hub_iata: string | null;
  aircraft_types: { name: string; icao_code: string; manufacturer: string } | null;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  category: string | null;
  shot_date: string;
  like_count: number;
  view_count: number;
  rating_sum: number;
  rating_count: number;
  operator: { id: string; name: string; iata: string | null; icao: string | null; hub_iata: string | null } | null;
  uploader: { username: string } | null;
};

const statusLabel = (s: DbStatus): string => {
  if (s === 'WFU' || s === 'PRESERVED') return 'Stored';
  return s.charAt(0) + s.slice(1).toLowerCase();
};

const StatusBadge = ({ status }: { status: DbStatus }) => {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    ACTIVE: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
    STORED: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    SCRAPPED: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
    WFU: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    PRESERVED: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  };
  const c = map[status] || map.ACTIVE;
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {statusLabel(status)}
    </span>
  );
};

const Lightbox = ({
  photo, onClose, onPrev, onNext,
}: {
  photo: { url: string; category: string; date: string; spotter: string };
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
    style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }} onClick={onClose}>
    <div className="flex items-center justify-between w-full max-w-5xl px-6 py-4" onClick={e => e.stopPropagation()}>
      <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{photo.date}</span>
      <button type="button" onClick={onClose} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="flex items-center gap-4 px-6 w-full max-w-5xl" onClick={e => e.stopPropagation()}>
      <button type="button" onClick={e => { e.stopPropagation(); onPrev(); }} className="p-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
        <ChevronLeft className="w-5 h-5" />
      </button>
      <img src={photo.url} className="flex-1 rounded-2xl object-contain" style={{ maxHeight: '70vh' }} alt="" referrerPolicy="no-referrer" />
      <button type="button" onClick={e => { e.stopPropagation(); onNext(); }} className="p-3 rounded-full" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
    <div className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{photo.spotter}</div>
  </motion.div>
);

export const AircraftDetailPage = ({ registration, onOpenRegistration, onBack, appUserId, isStaff }: AircraftDetailPageProps) => {
  const [tab, setTab] = useState<Tab>('Overview');
  const [loading, setLoading] = useState(true);
  const [ac, setAc] = useState<AcRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [similar, setSimilar] = useState<{ registration: string; status: DbStatus; photo_count: number; typeName: string }[]>([]);
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTypeText, setFormTypeText] = useState('');
  const [formOperatorText, setFormOperatorText] = useState('');
  const [formHubIata, setFormHubIata] = useState('');
  const [formMsn, setFormMsn] = useState('');
  const [formFirstFlight, setFormFirstFlight] = useState('');
  const [formHex, setFormHex] = useState('');
  const [formLine, setFormLine] = useState('');
  const [formSelcal, setFormSelcal] = useState('');
  const [formConfig, setFormConfig] = useState('');
  const [formEngines, setFormEngines] = useState('');
  const [formStatus, setFormStatus] = useState<DbStatus>('ACTIVE');

  const reg = (registration || '').trim().toUpperCase().replace(/\s+/g, '');

  const load = useCallback(async () => {
    if (!reg) {
      setAc(null);
      setPhotos([]);
      setSimilar([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setEditMsg(null);

    const { data: acRow } = await supabase
      .from('aircraft')
      .select(`
        id, registration, msn, line_number, icao_hex, selcal, year_built, first_flight,
        status, photo_count, view_count, like_count, created_by, type_id,
        seat_config, engines, home_hub_iata,
        aircraft_types ( name, icao_code, manufacturer )
      `)
      .eq('registration', reg)
      .maybeSingle();

    const raw = acRow as (AcRow & { aircraft_types?: AcRow['aircraft_types'] | AcRow['aircraft_types'][] }) | null;
    const typed: AcRow | null = raw
      ? {
        ...raw,
        seat_config: raw.seat_config ?? null,
        engines: raw.engines ?? null,
        home_hub_iata: raw.home_hub_iata ?? null,
        aircraft_types: asSingular(raw.aircraft_types as AcRow['aircraft_types'] | AcRow['aircraft_types'][] | null),
      }
      : null;
    setAc(typed);

    let photoList: PhotoRow[] = [];

    if (typed?.id) {
      const { data: phts } = await supabase
        .from('photos')
        .select(`
          id, storage_path, category, shot_date, like_count, view_count, rating_sum, rating_count,
          operator:airlines ( id, name, iata, icao, hub_iata ),
          uploader:user_profiles!uploader_id ( username )
        `)
        .eq('aircraft_id', typed.id)
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

      photoList = (phts ?? []) as PhotoRow[];
      setPhotos(photoList);

      if (typed.type_id) {
        const { data: sim } = await supabase
          .from('aircraft')
          .select('registration, status, photo_count, aircraft_types(name)')
          .eq('type_id', typed.type_id)
          .neq('id', typed.id)
          .limit(12);
        setSimilar((sim ?? []).map((r: any) => ({
          registration: r.registration,
          status: r.status as DbStatus,
          photo_count: r.photo_count,
          typeName: asSingular(r.aircraft_types)?.name || '—',
        })));
      } else setSimilar([]);
    } else {
      setPhotos([]);
      setSimilar([]);
    }

    if (typed) {
      setFormTypeText(typed.aircraft_types?.name || '');
      setFormMsn(typed.msn || '');
      setFormFirstFlight(typed.first_flight ? String(typed.first_flight).slice(0, 10) : '');
      setFormHex((typed.icao_hex || '').trim());
      setFormLine(typed.line_number || '');
      setFormSelcal(typed.selcal || '');
      setFormConfig((typed.seat_config || '').trim());
      setFormEngines((typed.engines || '').trim());
      setFormStatus(typed.status);
      setFormHubIata((typed.home_hub_iata || '').trim());
      let opName = '';
      for (const p of photoList) {
        const o = asSingular(p.operator);
        if (o?.name) {
          opName = o.name;
          break;
        }
      }
      setFormOperatorText(opName);
    }

    setLoading(false);
  }, [reg]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setTab('Overview');
    setLbIdx(null);
  }, [registration]);

  const typeName = ac?.aircraft_types?.name || 'Unknown type';
  const typeIcao = ac?.aircraft_types?.icao_code || '—';
  const manufacturer = ac?.aircraft_types?.manufacturer || '—';

  const firstOp = useMemo(() => {
    for (const p of photos) {
      const o = asSingular(p.operator);
      if (o?.name) return o;
    }
    return null;
  }, [photos]);

  const displayHubIata = useMemo(() => {
    const h = (ac?.home_hub_iata || '').trim() || (firstOp?.hub_iata || '').trim();
    return h || null;
  }, [ac?.home_hub_iata, firstOp?.hub_iata]);

  const typeSuggestions = useMemo(
    () => (formTypeText.trim().length >= 1 ? searchAircraftTypes(formTypeText.trim(), 8) : []),
    [formTypeText],
  );

  const airlineSuggestions = useMemo(
    () => (formOperatorText.trim().length >= 2 ? searchAirlines(formOperatorText.trim(), 8) : []),
    [formOperatorText],
  );

  const galleryItems = useMemo(() => photos.map(p => ({
    id: p.id,
    url: proxyImageUrl(p.storage_path || ''),
    category: (p.category || 'OTHER').replace(/_/g, ' '),
    date: p.shot_date,
    spotter: p.uploader?.username || 'Spotter',
    views: p.view_count,
    likes: p.like_count,
    ratingSum: p.rating_sum ?? 0,
    ratingCount: p.rating_count ?? 0,
  })), [photos]);

  const totalViews = photos.reduce((s, p) => s + (p.view_count || 0), 0);
  const totalLikes = photos.reduce((s, p) => s + (p.like_count || 0), 0);
  const photoCount = photos.length;

  const canEditRecord = !!ac && !!appUserId && (isStaff || ac.created_by === appUserId);

  const normTypeKey = (s: string) =>
    s.toLowerCase().replace(/\s+/g, '').replace(/-/g, '');

  const handleContribute = async () => {
    if (!reg) return;
    setSaving(true);
    setEditMsg(null);
    await contributeAircraftData({
      registration: reg,
      msn: formMsn || undefined,
      firstFlight: formFirstFlight || undefined,
      seatConfig: formConfig || undefined,
      engines: formEngines || undefined,
      status: formStatus,
    });
    setEditMsg('Correction submitted. Data may update after review.');
    setSaving(false);
    await load();
  };

  const handleSaveDirect = async () => {
    if (!ac || !canEditRecord) return;
    setSaving(true);
    setEditMsg(null);

    let typeId: string | null | undefined;
    if (formTypeText.trim()) {
      const ft = formTypeText.trim();
      const curName = ac.aircraft_types?.name?.trim() || '';
      if (ac.type_id && curName && normTypeKey(ft) === normTypeKey(curName)) {
        typeId = ac.type_id;
      } else {
        typeId = await resolveAircraftTypeId(supabase, ft, ac.aircraft_types?.manufacturer || undefined);
        if (!typeId) {
          setEditMsg(
            'Could not match this type in your database. Try the ICAO code (e.g. A333 for Airbus A330-300). Or open SQL Editor and run the file supabase/migrations/010_seed_a330_and_common_types.sql from the project — it adds A330 and a few other common types.',
          );
          setSaving(false);
          return;
        }
      }
    }

    let airlineId: string | null = null;
    if (formOperatorText.trim()) {
      const oid = await resolveOperatorId(supabase, formOperatorText.trim());
      if (!oid) {
        setEditMsg('Could not resolve airline. Try the official name, or IATA/ICAO from the catalog.');
        setSaving(false);
        return;
      }
      airlineId = oid;
    }

    const hubClean = formHubIata.trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);

    const updatePayload: Record<string, unknown> = {
      msn: formMsn.trim() || null,
      first_flight: formFirstFlight || null,
      icao_hex: formHex.trim() || null,
      line_number: formLine.trim() || null,
      selcal: formSelcal.trim() || null,
      status: formStatus,
      seat_config: formConfig.trim() || null,
      engines: formEngines.trim() || null,
      home_hub_iata: hubClean || null,
    };
    if (formTypeText.trim() && typeId) updatePayload.type_id = typeId;

    const { error } = await supabase.from('aircraft').update(updatePayload).eq('id', ac.id);
    if (error) {
      setSaving(false);
      setEditMsg(error.message);
      return;
    }

    const { error: rpcErr } = await supabase.rpc('set_operator_for_aircraft_photos', {
      p_aircraft_id: ac.id,
      p_airline_id: formOperatorText.trim() ? airlineId : null,
    });

    setSaving(false);
    if (rpcErr) setEditMsg(rpcErr.message);
    else {
      setEditMsg('Aircraft record updated.');
      await load();
    }
  };

  if (!registration || !reg) {
    return (
      <div className="site-w py-20 text-center">
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>No aircraft selected.</p>
        <button type="button" className="btn-primary" onClick={onBack}>Go back</button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: '#fff', minHeight: '100vh' }}>

      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <div className="site-w py-3 flex items-center gap-3">
          <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-medium"
            style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
      </div>

      {loading ? (
        <div className="site-w py-24 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#0ea5e9' }} />
          <span className="text-sm" style={{ color: '#94a3b8' }}>Loading {reg}…</span>
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden" style={{ minHeight: 320 }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)' }} />
            <div className="relative z-10 site-w py-10">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {ac ? <StatusBadge status={ac.status} /> : <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#fef3c7', color: '#92400e' }}>Not in database</span>}
                    <span className="tag">{typeIcao}</span>
                  </div>
                  <h1 className="font-headline text-5xl sm:text-6xl font-bold tracking-tight" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>{reg}</h1>
                  <div>
                    <div className="text-xl font-medium" style={{ color: '#475569' }}>{typeName}</div>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm" style={{ color: '#94a3b8' }}>
                      {ac?.msn && <span style={{ fontFamily: '"SF Mono",monospace' }}>MSN {ac.msn}</span>}
                      {ac?.msn && <span>·</span>}
                      <span>{manufacturer}</span>
                      {ac?.first_flight && (
                        <>
                          <span>·</span>
                          <span>First flight {String(ac.first_flight).slice(0, 10)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="btn-outline" style={{ height: 36, padding: '0 16px', fontSize: 13 }}>
                    <Share2 className="w-3.5 h-3.5" />Share
                  </button>
                  <button type="button" onClick={() => setLiked(v => !v)} className={liked ? 'btn-primary' : 'btn-outline'}
                    style={{ height: 36, padding: '0 16px', fontSize: 13, gap: 6 }}>
                    <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                    {liked ? 'Liked' : 'Like'} · {totalLikes || ac?.like_count || 0}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div className="site-w flex items-stretch overflow-x-auto no-scrollbar">
              {[
                { Icon: Camera, val: photoCount || ac?.photo_count || 0, label: 'photos' },
                { Icon: Eye, val: totalViews || ac?.view_count || 0, label: 'views' },
                { Icon: Heart, val: totalLikes || ac?.like_count || 0, label: 'likes' },
              ].map(({ Icon, val, label }, i) => (
                <div key={label} className="flex items-center gap-2 px-8 py-4 shrink-0" style={{ borderRight: i < 2 ? '1px solid #e8e8ed' : 'none' }}>
                  <Icon className="w-4 h-4" style={{ color: '#94a3b8' }} />
                  <span className="font-semibold text-sm" style={{ color: '#0f172a', fontFamily: '"SF Mono",monospace' }}>{typeof val === 'number' && val > 999 ? `${(val / 1000).toFixed(1)}K` : val}</span>
                  <span className="text-sm" style={{ color: '#94a3b8' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 52, zIndex: 40 }}>
            <div className="site-w flex items-center gap-0 flex-wrap">
              {(['Overview', 'Gallery', 'History', 'Similar'] as Tab[]).map(t => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className="text-sm px-6 py-4 transition-all font-medium"
                  style={{
                    color: tab === t ? '#0f172a' : '#475569',
                    borderBottom: tab === t ? '2px solid #0f172a' : '2px solid transparent',
                    fontWeight: tab === t ? 500 : 400,
                  }}>
                  {t}{t === 'Gallery' && (
                    <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full" style={{ background: '#f8fafc', color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>
                      {photoCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="site-w py-10">
            <AnimatePresence mode="wait">
              {tab === 'Overview' && (
                <motion.div key="ov" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                  <div className="xl:col-span-7 space-y-5">
                    {!ac && (
                      <div className="card p-6 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0" style={{ color: '#d97706' }} />
                        <div>
                          <div className="font-medium text-sm mb-1" style={{ color: '#0f172a' }}>No aircraft row yet</div>
                          <p className="text-sm" style={{ color: '#64748b' }}>
                            This registration is not in the database, or the record is still being created. Approved photos still appear in Fleet; open this page again after uploads sync.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="card overflow-hidden">
                      <div className="px-6 py-4" style={{ borderBottom: '1px solid #f5f5f7', background: '#f8fafc' }}>
                        <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Identity</h3>
                      </div>
                      <div className="px-6">
                        {[
                          { label: 'ICAO Type', value: typeIcao, mono: true },
                          { label: 'Manufacturer', value: manufacturer, mono: false },
                          { label: 'Operator', value: firstOp?.name || '—', mono: false },
                          { label: 'Hub (IATA)', value: displayHubIata || '—', mono: true },
                          { label: 'MSN', value: ac?.msn || '—', mono: true },
                          { label: 'Line Number', value: ac?.line_number || '—', mono: true },
                          { label: 'ICAO 24-bit', value: ac?.icao_hex || '—', mono: true },
                          { label: 'SELCAL', value: ac?.selcal || '—', mono: true },
                        ].map((row, ri, arr) => (
                          <div key={row.label} className="flex items-center justify-between py-3" style={{ borderBottom: ri < arr.length - 1 ? '1px solid #f5f5f7' : 'none' }}>
                            <span className="text-sm" style={{ color: '#94a3b8' }}>{row.label}</span>
                            <span className="text-sm font-medium" style={{ color: row.mono ? '#0ea5e9' : '#0f172a', fontFamily: row.mono ? '"SF Mono",monospace' : undefined }}>{row.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {appUserId && (
                      <div className="card overflow-hidden">
                        <div className="px-6 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #f5f5f7', background: '#f8fafc' }}>
                          <Pencil className="w-4 h-4" style={{ color: '#64748b' }} />
                          <h3 className="text-sm font-semibold" style={{ color: '#0f172a' }}>Correct or add details</h3>
                        </div>
                        <div className="p-6 space-y-3">
                          <p className="text-xs" style={{ color: '#64748b' }}>
                            {canEditRecord
                              ? 'You created this record or you are staff — you can save type, operator, hub, and technical fields to the database.'
                              : 'Submit corrections for technical fields below. Changing type, airline, or hub requires the record owner or staff — use Save to record on an account that created this aircraft.'}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Aircraft type</label>
                              <input
                                value={formTypeText}
                                onChange={e => setFormTypeText(e.target.value)}
                                disabled={!canEditRecord}
                                placeholder="e.g. Boeing 737-800 or B738"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                              />
                              {canEditRecord && typeSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {typeSuggestions.map(t => (
                                    <button
                                      key={t.icao_code}
                                      type="button"
                                      onClick={() => setFormTypeText(t.name)}
                                      className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                                      style={{ color: '#334155' }}
                                    >
                                      {t.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Operator / airline</label>
                              <input
                                value={formOperatorText}
                                onChange={e => setFormOperatorText(e.target.value)}
                                disabled={!canEditRecord}
                                placeholder="Airline name or IATA"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:opacity-60"
                              />
                              {canEditRecord && airlineSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {airlineSuggestions.map(a => (
                                    <button
                                      key={`${a.icao}-${a.name}`}
                                      type="button"
                                      onClick={() => setFormOperatorText(a.name)}
                                      className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                                      style={{ color: '#334155' }}
                                    >
                                      {a.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Home hub (IATA)</label>
                              <input
                                value={formHubIata}
                                onChange={e => setFormHubIata(e.target.value.toUpperCase().replace(/[^A-Za-z]/g, '').slice(0, 3))}
                                disabled={!canEditRecord}
                                placeholder="e.g. PVG"
                                maxLength={3}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono disabled:opacity-60"
                              />
                              <p className="text-[10px] mt-1" style={{ color: '#94a3b8' }}>Optional. Airline default hub shows if set in the directory.</p>
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>MSN</label>
                              <input value={formMsn} onChange={e => setFormMsn(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" style={{ fontFamily: '"B612 Mono",monospace' }} />
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>First flight</label>
                              <input type="date" value={formFirstFlight} onChange={e => setFormFirstFlight(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>ICAO hex</label>
                              <input value={formHex} onChange={e => setFormHex(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" style={{ fontFamily: '"B612 Mono",monospace' }} />
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Line number</label>
                              <input value={formLine} onChange={e => setFormLine(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>SELCAL</label>
                              <input value={formSelcal} onChange={e => setFormSelcal(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Status</label>
                              <select value={formStatus} onChange={e => setFormStatus(e.target.value as DbStatus)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                {(['ACTIVE', 'STORED', 'SCRAPPED', 'WFU', 'PRESERVED'] as DbStatus[]).map(s => (
                                  <option key={s} value={s}>{statusLabel(s)}</option>
                                ))}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Seat config</label>
                              <input value={formConfig} onChange={e => setFormConfig(e.target.value)} placeholder="e.g. C30 Y234" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-xs block mb-1" style={{ color: '#94a3b8' }}>Engines</label>
                              <input value={formEngines} onChange={e => setFormEngines(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-2">
                            <button type="button" disabled={saving} onClick={handleContribute} className="btn-outline" style={{ height: 38, fontSize: 13 }}>
                              {saving ? '…' : 'Submit correction'}
                            </button>
                            {canEditRecord && (
                              <button type="button" disabled={saving} onClick={handleSaveDirect} className="btn-primary" style={{ height: 38, fontSize: 13 }}>
                                Save to record
                              </button>
                            )}
                          </div>
                          {editMsg && <p className="text-xs mt-2" style={{ color: editMsg.includes('error') || editMsg.includes('violat') ? '#dc2626' : '#16a34a' }}>{editMsg}</p>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="xl:col-span-5">
                    <div className="card p-6">
                      <h3 className="text-sm font-semibold mb-4" style={{ color: '#0f172a' }}>Operator &amp; base</h3>
                      {firstOp ? (
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg" style={{ background: '#f8fafc', color: '#0f172a' }}>
                            {(firstOp.iata || firstOp.icao || '?').slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold" style={{ color: '#0f172a' }}>{firstOp.name}</div>
                            <div className="text-xs mt-0.5" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>
                              {firstOp.iata || '—'} · {firstOp.icao || '—'}
                            </div>
                            <div className="text-xs mt-2" style={{ color: '#64748b' }}>
                              Hub <span className="font-mono" style={{ color: '#0f172a' }}>{displayHubIata || '—'}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: '#94a3b8' }}>No operator on approved photos yet. Set one in “Correct or add details” if you own this record.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {tab === 'Gallery' && (
                <motion.div key="gal" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {galleryItems.length === 0 ? (
                    <p className="text-sm text-center py-16" style={{ color: '#94a3b8' }}>No approved photos yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {galleryItems.map((photo, i) => (
                        <motion.div key={photo.id} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                          className={`card cursor-pointer overflow-hidden ${i === 0 ? 'md:col-span-2' : ''}`} onClick={() => setLbIdx(i)}>
                          <div className={`relative overflow-hidden ${i === 0 ? 'aspect-[16/9]' : 'aspect-[4/3]'}`} style={{ borderRadius: '18px 18px 0 0' }}>
                            <img src={photo.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                            <div className="absolute top-3 left-3">
                              <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.9)', color: '#525252' }}>{photo.category}</span>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(transparent,rgba(0,0,0,0.65))' }}>
                              <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.95)' }}>{photo.date}</div>
                              <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                <Eye className="w-3 h-3 shrink-0" />
                                <span>{photo.views}</span>
                              </div>
                              <div className="mt-1.5">
                                <PhotoStarDisplay
                                  ratingSum={photo.ratingSum}
                                  ratingCount={photo.ratingCount}
                                  compact
                                  labelColor="rgba(255,255,255,0.75)"
                                />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'History' && (
                <motion.div key="hist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-3xl">
                  <h2 className="font-headline text-2xl font-bold mb-8 tracking-tight" style={{ color: '#0f172a' }}>Operators in approved photos</h2>
                  {photos.length === 0 ? (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No history yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {photos
                        .map(p => ({ p, o: asSingular(p.operator) }))
                        .filter(({ o }) => o?.name)
                        .map(({ p, o }) => (
                          <div key={p.id} className="card p-4 flex justify-between items-center flex-wrap gap-2">
                            <div>
                              <div className="font-medium" style={{ color: '#0f172a' }}>{o!.name}</div>
                              <div className="text-xs" style={{ color: '#94a3b8' }}>{p.shot_date}</div>
                            </div>
                            <span className="text-xs font-mono" style={{ color: '#64748b' }}>{o!.iata || '—'} / {o!.icao || '—'}</span>
                          </div>
                        ))}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'Similar' && (
                <motion.div key="sim" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <h2 className="font-headline text-2xl font-bold mb-8 tracking-tight" style={{ color: '#0f172a' }}>Same aircraft type</h2>
                  {similar.length === 0 ? (
                    <p className="text-sm" style={{ color: '#94a3b8' }}>No similar aircraft indexed, or type not set on this record.</p>
                  ) : (
                    <div className="space-y-3">
                      {similar.map(s => (
                        <div
                          key={s.registration}
                          role={onOpenRegistration ? 'button' : undefined}
                          tabIndex={onOpenRegistration ? 0 : undefined}
                          onClick={() => onOpenRegistration?.(s.registration)}
                          onKeyDown={e => { if (onOpenRegistration && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onOpenRegistration(s.registration); } }}
                          className={`card flex items-center gap-5 p-5 ${onOpenRegistration ? 'cursor-pointer hover:border-slate-300 transition-colors' : ''}`}
                        >
                          <span className="font-headline text-xl font-bold" style={{ color: '#0f172a', minWidth: 100 }}>{s.registration}</span>
                          <div className="flex-1 text-sm" style={{ color: '#64748b' }}>{s.typeName}</div>
                          <StatusBadge status={s.status} />
                          <span className="text-sm flex items-center gap-1" style={{ color: '#94a3b8', fontFamily: '"SF Mono",monospace' }}>
                            <Camera className="w-3.5 h-3.5" />{s.photo_count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {lbIdx !== null && galleryItems[lbIdx] && (
              <Lightbox
                photo={{
                  url: galleryItems[lbIdx].url,
                  category: galleryItems[lbIdx].category,
                  date: galleryItems[lbIdx].date,
                  spotter: galleryItems[lbIdx].spotter,
                }}
                onClose={() => setLbIdx(null)}
                onPrev={() => setLbIdx(i => i !== null ? (i - 1 + galleryItems.length) % galleryItems.length : null)}
                onNext={() => setLbIdx(i => i !== null ? (i + 1) % galleryItems.length : null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </motion.div>
  );
};
