import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Users,
  Globe2,
  ExternalLink,
  MapPin,
  Loader2,
  ChevronRight,
  X,
  Plus,
  Lock,
  ArrowLeft,
  Send,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { supabase } from '../lib/supabase';

type ForumCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  color: string | null;
};

type ThreadRow = {
  id: string;
  title: string;
  reply_count: number;
  created_at: string;
  last_reply_at: string | null;
  is_locked: boolean;
  author: { username: string; display_name: string | null } | null;
};

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string | null } | null;
};

type ThreadDetail = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  reply_count: number;
  is_locked: boolean;
  author: { username: string; display_name: string | null } | null;
  category: { slug: string; name: string } | null;
};

const SECTIONS: {
  slug: 'general' | 'id' | 'spotting';
  label: string;
  blurb: string;
  Icon: typeof MessageSquare;
}[] = [
  { slug: 'general', label: 'Discussions', blurb: 'General aviation chat & questions', Icon: MessageSquare },
  { slug: 'id', label: 'ID Help', blurb: 'Mystery registrations & type IDs', Icon: Users },
  { slug: 'spotting', label: 'Reports', blurb: 'Airport visits & trip reports', Icon: Globe2 },
];

function readThreadFromUrl(): string | null {
  const id = new URLSearchParams(window.location.search).get('thread');
  return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

function setCommunityUrl(threadId: string | null) {
  const path = '/community';
  const url = threadId ? `${path}?thread=${encodeURIComponent(threadId)}` : path;
  window.history.pushState({}, '', url);
}

function fmtAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const CommunityPage = ({
  navEpoch,
  viewerUserId,
  onRequireLogin,
}: {
  navEpoch: number;
  viewerUserId: string | null;
  onRequireLogin: () => void;
}) => {
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [categories, setCategories] = useState<Record<string, ForumCategory>>({});
  const [threadsBySlug, setThreadsBySlug] = useState<Record<string, ThreadRow[]>>({});
  const [countsBySlug, setCountsBySlug] = useState<Record<string, number>>({});

  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(() => readThreadFromUrl());
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null);
  const [threadPosts, setThreadPosts] = useState<PostRow[]>([]);
  const [threadLoad, setThreadLoad] = useState<'idle' | 'loading' | 'ok'>('idle');
  const [replyBody, setReplyBody] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const [replyErr, setReplyErr] = useState<string | null>(null);

  const [compose, setCompose] = useState<{ slug: string; categoryId: string } | null>(null);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeErr, setComposeErr] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoadState('loading');
    try {
      const { data: cats, error: cErr } = await supabase
        .from('forum_categories')
        .select('id, slug, name, description, color')
        .in('slug', ['general', 'id', 'spotting'])
        .order('sort_order', { ascending: true });

      if (cErr) throw cErr;
      const catRows = (cats ?? []) as ForumCategory[];
      const bySlug: Record<string, ForumCategory> = {};
      for (const c of catRows) bySlug[c.slug] = c;

      const threadsOut: Record<string, ThreadRow[]> = {};
      const countsOut: Record<string, number> = {};

      for (const s of SECTIONS) {
        const cat = bySlug[s.slug];
        if (!cat) {
          threadsOut[s.slug] = [];
          countsOut[s.slug] = 0;
          continue;
        }
        const [{ count }, { data: th }] = await Promise.all([
          supabase.from('forum_threads').select('id', { count: 'exact', head: true }).eq('category_id', cat.id),
          supabase
            .from('forum_threads')
            .select(
              `
              id, title, reply_count, created_at, last_reply_at, is_locked,
              author:user_profiles!forum_threads_author_id_fkey ( username, display_name )
            `,
            )
            .eq('category_id', cat.id)
            .order('created_at', { ascending: false })
            .limit(6),
        ]);
        countsOut[s.slug] = count ?? 0;
        threadsOut[s.slug] = (th ?? []).map((r: any): ThreadRow => ({
          ...r,
          author: Array.isArray(r.author) ? (r.author[0] ?? null) : (r.author ?? null),
        }));
      }

      setCategories(bySlug);
      setThreadsBySlug(threadsOut);
      setCountsBySlug(countsOut);
      setLoadState('ok');
    } catch (e) {
      console.warn('Community forum load:', e);
      setLoadState('err');
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    setSelectedThreadId(readThreadFromUrl());
  }, [navEpoch]);

  useEffect(() => {
    const onPop = () => setSelectedThreadId(readThreadFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openThread = (id: string) => {
    setSelectedThreadId(id);
    setCommunityUrl(id);
  };

  const closeThread = () => {
    setSelectedThreadId(null);
    setThreadDetail(null);
    setThreadPosts([]);
    setReplyBody('');
    setReplyErr(null);
    setCommunityUrl(null);
  };

  useEffect(() => {
    if (!selectedThreadId) {
      setThreadDetail(null);
      setThreadPosts([]);
      setThreadLoad('idle');
      return;
    }
    let cancelled = false;
    (async () => {
      setThreadLoad('loading');
      setReplyErr(null);
      try {
        const { data: t, error: te } = await supabase
          .from('forum_threads')
          .select(
            `
            id, title, body, created_at, reply_count, is_locked,
            author:user_profiles!forum_threads_author_id_fkey ( username, display_name ),
            category:forum_categories ( slug, name )
          `,
          )
          .eq('id', selectedThreadId)
          .single();

        if (cancelled) return;
        if (te || !t) {
          setThreadDetail(null);
          setThreadPosts([]);
          setThreadLoad('ok');
          return;
        }

        const row = t as Record<string, unknown> & {
          id: string;
          title: string;
          body: string;
          created_at: string;
          reply_count: number;
          is_locked: boolean;
          author: unknown;
          category: unknown;
        };
        const catRaw = row.category;
        const cat = Array.isArray(catRaw) ? (catRaw[0] as ThreadDetail['category']) ?? null : (catRaw as ThreadDetail['category']);
        const authRaw = row.author;
        const auth = Array.isArray(authRaw)
          ? (authRaw[0] as ThreadDetail['author']) ?? null
          : (authRaw as ThreadDetail['author']);
        setThreadDetail({
          id: row.id,
          title: row.title,
          body: row.body,
          created_at: row.created_at,
          reply_count: row.reply_count,
          is_locked: row.is_locked,
          author: auth,
          category: cat,
        });

        const { data: posts, error: pe } = await supabase
          .from('forum_posts')
          .select(
            `
            id, body, created_at,
            author:user_profiles!forum_posts_author_id_fkey ( username, display_name )
          `,
          )
          .eq('thread_id', selectedThreadId)
          .order('created_at', { ascending: true });

        if (cancelled) return;
        if (pe) {
          setThreadPosts([]);
        } else {
          setThreadPosts(
            (posts ?? []).map((p: any): PostRow => ({
              ...p,
              author: Array.isArray(p.author) ? (p.author[0] ?? null) : (p.author ?? null),
            })),
          );
        }
        setThreadLoad('ok');
      } catch {
        if (!cancelled) setThreadLoad('ok');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId]);

  const submitReply = async () => {
    if (!viewerUserId || !selectedThreadId || !threadDetail?.id) {
      onRequireLogin();
      return;
    }
    if (threadDetail.is_locked) return;
    const body = replyBody.trim();
    if (body.length < 1) return;
    setReplyBusy(true);
    setReplyErr(null);
    try {
      const { error } = await supabase.from('forum_posts').insert({
        thread_id: selectedThreadId,
        author_id: viewerUserId,
        body,
      });
      if (error) throw error;
      setReplyBody('');
      const { data: posts } = await supabase
        .from('forum_posts')
        .select(
          `
          id, body, created_at,
          author:user_profiles!forum_posts_author_id_fkey ( username, display_name )
        `,
        )
        .eq('thread_id', selectedThreadId)
        .order('created_at', { ascending: true });
      setThreadPosts(
        (posts ?? []).map((p: any): PostRow => ({
          ...p,
          author: Array.isArray(p.author) ? (p.author[0] ?? null) : (p.author ?? null),
        })),
      );
      void loadBoard();
    } catch (e: unknown) {
      setReplyErr(e instanceof Error ? e.message : 'Could not post reply');
    } finally {
      setReplyBusy(false);
    }
  };

  const submitNewThread = async () => {
    if (!viewerUserId || !compose) {
      onRequireLogin();
      return;
    }
    const title = composeTitle.trim();
    const body = composeBody.trim();
    if (title.length < 3 || body.length < 4) {
      setComposeErr('Title (3+ chars) and opening post (4+ chars) required.');
      return;
    }
    setComposeBusy(true);
    setComposeErr(null);
    try {
      const { data: ins, error } = await supabase
        .from('forum_threads')
        .insert({
          category_id: compose.categoryId,
          author_id: viewerUserId,
          title: title.slice(0, 200),
          body: body.slice(0, 10000),
        })
        .select('id')
        .single();
      if (error) throw error;
      setCompose(null);
      setComposeTitle('');
      setComposeBody('');
      void loadBoard();
      if (ins?.id) openThread(ins.id as string);
    } catch (e: unknown) {
      setComposeErr(e instanceof Error ? e.message : 'Could not create topic');
    } finally {
      setComposeBusy(false);
    }
  };

  const startCompose = (slug: string) => {
    if (!viewerUserId) {
      onRequireLogin();
      return;
    }
    const cat = categories[slug];
    if (!cat) return;
    setCompose({ slug, categoryId: cat.id });
    setComposeTitle('');
    setComposeBody('');
    setComposeErr(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: 'transparent', minHeight: '100vh' }}
      className="relative z-10"
    >
      <section
        style={{
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.1)',
        }}
      >
        <div className="site-w py-10">
          <div
            className="mb-2 text-xs font-medium uppercase tracking-wide"
            style={{ color: '#94a3b8', letterSpacing: '0.05em', fontSize: 11 }}
          >
            Community
          </div>
          <h1
            className="font-headline text-4xl font-bold tracking-tight"
            style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
          >
            Forums
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>
            Discuss aviation, get ID help, and share spotting reports — tied to the same database as the rest of SILKSPOT.
          </p>
        </div>
      </section>

      <div className="site-w py-10">
        {loadState === 'err' && (
          <p className="mb-6 text-center text-sm" style={{ color: '#b91c1c' }}>
            Could not load forums. Check Supabase and that forum tables are migrated.
          </p>
        )}

        <AnimatePresence mode="wait">
          {selectedThreadId ? (
            <motion.section
              key="thread"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mx-auto max-w-3xl"
            >
              <button
                type="button"
                onClick={closeThread}
                className="mb-4 flex items-center gap-2 text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: '#64748b' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to forums
              </button>

              {threadLoad === 'loading' && (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#94a3b8' }} />
                </div>
              )}

              {threadLoad === 'ok' && !threadDetail && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>
                  Topic not found or was removed.
                </p>
              )}

              {threadDetail && (
                <div className="card overflow-hidden">
                  <div className="border-b px-5 py-4" style={{ borderColor: '#f1f5f9', background: '#fafbfc' }}>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {threadDetail.category ? (
                        <span className="tag text-[10px]">{threadDetail.category.name}</span>
                      ) : null}
                      {threadDetail.is_locked ? (
                        <span
                          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px]"
                          style={{ background: '#fef3c7', color: '#92400e' }}
                        >
                          <Lock className="h-3 w-3" />
                          Locked
                        </span>
                      ) : null}
                    </div>
                    <h2 className="font-headline text-xl font-bold tracking-tight" style={{ color: '#0f172a' }}>
                      {threadDetail.title}
                    </h2>
                    <p className="mt-2 text-xs" style={{ color: '#94a3b8' }}>
                      {threadDetail.author?.display_name || threadDetail.author?.username || 'Member'} ·{' '}
                      {fmtAgo(threadDetail.created_at)}
                    </p>
                  </div>
                  <div className="space-y-0">
                    <div className="border-b px-5 py-4" style={{ borderColor: '#f1f5f9' }}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#334155' }}>
                        {threadDetail.body}
                      </p>
                    </div>
                    {threadPosts.map(p => (
                      <div key={p.id} className="border-b px-5 py-3 last:border-0" style={{ borderColor: '#f8fafc' }}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-medium" style={{ color: '#0f172a' }}>
                            {p.author?.display_name || p.author?.username || 'Member'}
                          </span>
                          <span className="font-mono text-[10px]" style={{ color: '#cbd5e1' }}>
                            {fmtAgo(p.created_at)}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#475569' }}>
                          {p.body}
                        </p>
                      </div>
                    ))}
                  </div>

                  {!threadDetail.is_locked && viewerUserId ? (
                    <div className="border-t p-4" style={{ borderColor: '#f1f5f9' }}>
                      <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                        Reply
                      </label>
                      <textarea
                        value={replyBody}
                        onChange={e => setReplyBody(e.target.value)}
                        rows={3}
                        className="mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
                        style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                        placeholder="Write a reply…"
                        maxLength={10000}
                      />
                      {replyErr ? <p className="mb-2 text-xs" style={{ color: '#dc2626' }}>{replyErr}</p> : null}
                      <button
                        type="button"
                        disabled={replyBusy || replyBody.trim().length < 1}
                        onClick={() => void submitReply()}
                        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        style={{ background: '#0ea5e9' }}
                      >
                        {replyBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Post reply
                      </button>
                    </div>
                  ) : !threadDetail.is_locked && !viewerUserId ? (
                    <div className="border-t px-5 py-4 text-xs" style={{ borderColor: '#f1f5f9', color: '#64748b' }}>
                      <button type="button" className="font-semibold text-sky-600" onClick={onRequireLogin}>
                        Sign in
                      </button>{' '}
                      to reply.
                    </div>
                  ) : null}
                </div>
              )}
            </motion.section>
          ) : (
            <motion.div
              key="board"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {SECTIONS.map(({ slug, label, blurb, Icon }) => {
                  const cat = categories[slug];
                  const threads = threadsBySlug[slug] ?? [];
                  const total = countsBySlug[slug] ?? 0;
                  const accent = cat?.color || '#0ea5e9';

                  return (
                    <div
                      key={slug}
                      className="card flex flex-col overflow-hidden"
                      style={{ borderTop: `3px solid ${accent}` }}
                    >
                      <div className="border-b px-4 py-3" style={{ borderColor: '#f1f5f9', background: '#fafbfc' }}>
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: `${accent}18`, color: accent }}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-headline text-sm font-bold tracking-tight" style={{ color: '#0f172a' }}>
                              {label}
                            </h3>
                            <p className="mt-0.5 text-[11px] leading-snug" style={{ color: '#64748b' }}>
                              {cat?.description || blurb}
                            </p>
                            <p className="mt-2 font-mono text-[10px]" style={{ color: '#94a3b8' }}>
                              {loadState === 'loading' ? '…' : `${total} topic${total === 1 ? '' : 's'}`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => startCompose(slug)}
                          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-[11px] font-semibold transition-colors hover:bg-slate-50"
                          style={{ borderColor: '#e2e8f0', color: '#0f172a' }}
                        >
                          <Plus className="h-3.5 w-3.5" style={{ color: accent }} />
                          New topic
                        </button>
                      </div>

                      <div className="min-h-[200px] flex-1 space-y-0">
                        {loadState === 'loading' && (
                          <div className="flex justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#cbd5e1' }} />
                          </div>
                        )}
                        {loadState === 'ok' && threads.length === 0 && (
                          <p className="px-4 py-8 text-center text-[11px] leading-relaxed" style={{ color: '#94a3b8' }}>
                            No threads yet — start the first conversation.
                          </p>
                        )}
                        {threads.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => openThread(t.id)}
                            className="flex w-full items-start gap-2 border-b px-4 py-3 text-left transition-colors last:border-0 hover:bg-slate-50/80"
                            style={{ borderColor: '#f8fafc' }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="line-clamp-2 text-xs font-medium" style={{ color: '#0f172a' }}>
                                  {t.title}
                                </span>
                                {t.is_locked ? <Lock className="h-3 w-3 shrink-0 text-amber-600" /> : null}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]" style={{ color: '#94a3b8' }}>
                                <span>{t.author?.display_name || t.author?.username || 'Member'}</span>
                                <span>·</span>
                                <span>{t.reply_count} repl{t.reply_count === 1 ? 'y' : 'ies'}</span>
                              </div>
                            </div>
                            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 opacity-40" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="card mx-auto max-w-lg p-4">
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" style={{ color: '#94a3b8' }} />
                  <span className="text-xs font-semibold" style={{ color: '#0f172a' }}>
                    Spotting locations
                  </span>
                </div>
                <a
                  href="https://www.spotterguide.net/planespotting/asia/uzbekistan/tashkent-islam-karimov-tas-uttt/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: '#0ea5e9' }}
                >
                  Tashkent Intl (TAS/UTTT) spotting guide
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {compose && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center"
            style={{ background: 'rgba(15,23,42,0.45)' }}
            onClick={() => !composeBusy && setCompose(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              className="relative w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl"
              style={{ borderColor: '#e2e8f0' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg p-1.5 hover:bg-slate-100"
                style={{ color: '#64748b' }}
                onClick={() => !composeBusy && setCompose(null)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="font-headline pr-8 text-lg font-bold" style={{ color: '#0f172a' }}>
                New topic · {SECTIONS.find(s => s.slug === compose.slug)?.label}
              </h3>
              <label className="mt-4 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                Title
              </label>
              <input
                value={composeTitle}
                onChange={e => setComposeTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
                style={{ borderColor: '#e2e8f0' }}
                maxLength={200}
                placeholder="Short headline"
              />
              <label className="mt-3 block text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94a3b8' }}>
                Opening post
              </label>
              <textarea
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                rows={5}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500/30"
                style={{ borderColor: '#e2e8f0' }}
                maxLength={10000}
                placeholder="Context, photos links, question…"
              />
              {composeErr ? <p className="mt-2 text-xs" style={{ color: '#dc2626' }}>{composeErr}</p> : null}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={composeBusy}
                  onClick={() => setCompose(null)}
                  className="rounded-lg px-4 py-2 text-xs font-medium transition-colors hover:bg-slate-100"
                  style={{ color: '#64748b' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={composeBusy}
                  onClick={() => void submitNewThread()}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: '#0f172a' }}
                >
                  {composeBusy ? 'Posting…' : 'Publish'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
