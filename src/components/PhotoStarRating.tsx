import { Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

function avgStars(ratingSum: number, ratingCount: number): number {
  if (!ratingCount || ratingSum <= 0) return 0;
  return ratingSum / ratingCount;
}

/** Read-only row of stars from aggregate (no auth). */
export function PhotoStarDisplay({
  ratingSum,
  ratingCount,
  compact,
  dense,
  large,
  labelColor = '#64748b',
}: {
  ratingSum: number;
  ratingCount: number;
  compact?: boolean;
  /** Extra-small row (buffer strip) */
  dense?: boolean;
  /** Match interactive `PhotoStarRating` large hero size */
  large?: boolean;
  labelColor?: string;
}) {
  const avg = avgStars(ratingSum, ratingCount);
  const sz = large ? 'w-5 h-5' : dense ? 'w-2.5 h-2.5' : compact ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const sw = large ? 1.75 : dense ? 1.25 : 1.5;
  return (
    <div className={`flex items-center ${large ? 'gap-1' : dense ? 'gap-px' : 'gap-0.5'}`}>
      {[1, 2, 3, 4, 5].map(n => {
        const filled = avg >= n - 0.5;
        return (
          <Star
            key={n}
            className={sz}
            strokeWidth={filled ? 0 : sw}
            style={{ color: filled ? '#ca8a04' : '#94a3b8', fill: filled ? '#eab308' : 'transparent' }}
          />
        );
      })}
      {ratingCount > 0 && (
        <span
          className={`tabular-nums ${large ? 'text-xs ml-1' : dense ? 'text-[9px] ml-0.5' : 'text-[10px] ml-1'}`}
          style={{ color: labelColor }}
        >
          {avg.toFixed(1)}
        </span>
      )}
    </div>
  );
}

type Props = {
  photoId: string;
  ratingSum: number;
  ratingCount: number;
  /** uploader_id of the photo — prevents the owner from rating their own photo */
  uploaderId?: string | null;
  /** Allow logged-in users to submit / change their rating */
  interactive?: boolean;
  /** Smaller stars + tighter layout */
  compact?: boolean;
  /** Tighter still (e.g. explore buffer strip) */
  dense?: boolean;
  /** Larger stars (e.g. photo detail hero row) */
  large?: boolean;
  /** Optional class on wrapper */
  className?: string;
  /** Lighter star strokes / text for use on dark photo overlays */
  variant?: 'default' | 'onDark';
  onAggregatesChange?: (sum: number, count: number) => void;
};

export function PhotoStarRating({
  photoId,
  ratingSum: initialSum,
  ratingCount: initialCount,
  uploaderId,
  interactive = true,
  compact = false,
  dense = false,
  large = false,
  className = '',
  variant = 'default',
  onAggregatesChange,
}: Props) {
  const [sum, setSum] = useState(initialSum);
  const [count, setCount] = useState(initialCount);
  const [myStars, setMyStars] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setSum(initialSum);
    setCount(initialCount);
  }, [initialSum, initialCount, photoId]);

  const loadMine = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? null;
    setUserId(uid);
    if (!uid || !photoId) {
      setMyStars(null);
      return;
    }
    const { data } = await supabase
      .from('photo_ratings')
      .select('stars')
      .eq('photo_id', photoId)
      .eq('user_id', uid)
      .maybeSingle();
    setMyStars(data?.stars ?? null);
  }, [photoId]);

  useEffect(() => {
    void loadMine();
  }, [loadMine]);

  const isOwnPhoto = !!(userId && uploaderId && userId === uploaderId);

  const submit = async (stars: number) => {
    if (!interactive || !userId || busy || isOwnPhoto) return;
    setBusy(true);
    const prevMine = myStars;
    const prevSum = sum;
    const prevCount = count;
    const nextMine = stars;
    let nextSum = sum;
    let nextCount = count;
    if (prevMine == null) {
      nextSum = sum + stars;
      nextCount = count + 1;
    } else {
      nextSum = sum - prevMine + stars;
      nextCount = count;
    }
    setMyStars(nextMine);
    setSum(nextSum);
    setCount(nextCount);
    onAggregatesChange?.(nextSum, nextCount);

    const { error } = await supabase.from('photo_ratings').upsert(
      { photo_id: photoId, user_id: userId, stars },
      { onConflict: 'photo_id,user_id' },
    );
    if (error) {
      console.error(error);
      setMyStars(prevMine);
      setSum(prevSum);
      setCount(prevCount);
      onAggregatesChange?.(prevSum, prevCount);
    } else {
      const { data: row } = await supabase
        .from('photos')
        .select('rating_sum, rating_count')
        .eq('id', photoId)
        .single();
      if (row) {
        setSum(row.rating_sum ?? nextSum);
        setCount(row.rating_count ?? nextCount);
        onAggregatesChange?.(row.rating_sum ?? nextSum, row.rating_count ?? nextCount);
      }
    }
    setBusy(false);
  };

  const avg = avgStars(sum, count);
  const sz = large ? 'w-5 h-5' : compact ? (dense ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5') : 'w-4 h-4';
  const gap = large ? 'gap-1' : dense ? 'gap-0' : compact ? 'gap-0.5' : 'gap-1';
  const starStroke = dense ? 1.25 : large ? 1.75 : 1.5;

  const starFilled = (n: number) => {
    const personal = hover ?? myStars;
    if (interactive && userId && personal != null) return personal >= n;
    return avg >= n - 0.5;
  };

  const emptyStar = variant === 'onDark' ? 'rgba(255,255,255,0.35)' : '#cbd5e1';
  const metaColor = variant === 'onDark' ? 'rgba(255,255,255,0.75)' : '#94a3b8';
  const signInColor = variant === 'onDark' ? 'rgba(255,255,255,0.55)' : '#cbd5e1';

  const MIN_VOTES = 3;
  const hasEnoughVotes = count >= MIN_VOTES;

  if (!interactive) {
    return (
      <div className={className} onClick={e => e.stopPropagation()}>
        {hasEnoughVotes
          ? <PhotoStarDisplay ratingSum={sum} ratingCount={count} large={large} compact={compact && !large} dense={dense && !large} labelColor={metaColor} />
          : count > 0
            ? <span className={dense ? 'text-[9px]' : 'text-[10px]'} style={{ color: metaColor }}>{count} vote{count !== 1 ? 's' : ''}</span>
            : null}
      </div>
    );
  }

  // Owner sees read-only display only (no interactive stars)
  if (isOwnPhoto) {
    return (
      <div className={`flex items-center ${gap} ${className}`} onClick={e => e.stopPropagation()}>
        {hasEnoughVotes
          ? <PhotoStarDisplay ratingSum={sum} ratingCount={count} large={large} compact={compact && !large} dense={dense && !large} labelColor={metaColor} />
          : <span className={large ? 'text-xs' : dense ? 'text-[9px]' : 'text-[11px]'} style={{ color: metaColor }}>
              {count > 0 ? `${count} vote${count !== 1 ? 's' : ''}` : 'No votes yet'}
            </span>}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center ${gap} ${className}`} onClick={e => e.stopPropagation()}>
      <div
        className={`flex items-center ${gap}`}
        role={userId ? 'group' : undefined}
        onMouseLeave={() => userId && setHover(null)}
      >
        {[1, 2, 3, 4, 5].map(n => {
          const filled = starFilled(n);
          return (
            <button
              key={n}
              type="button"
              disabled={!userId || busy}
              className={`${dense ? 'p-0' : 'p-0.5'} rounded transition-colors ${userId ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
              style={{ background: 'none', border: 'none', lineHeight: 0 }}
              aria-label={`${n} stars`}
              onMouseEnter={() => userId && setHover(n)}
              onClick={() => submit(n)}
            >
              <Star
                className={`${sz} shrink-0 transition-colors`}
                strokeWidth={filled ? 0 : starStroke}
                style={{
                  color: filled ? '#ca8a04' : emptyStar,
                  fill: filled ? '#eab308' : 'transparent',
                }}
              />
            </button>
          );
        })}
      </div>
      {hasEnoughVotes && (
        <span
          className={`tabular-nums ${large ? 'text-xs' : dense ? 'text-[9px]' : 'text-[11px]'}`}
          style={{ color: metaColor }}
        >
          {avg.toFixed(1)} ({count})
        </span>
      )}
      {!hasEnoughVotes && count > 0 && (
        <span className={large ? 'text-xs' : dense ? 'text-[9px]' : 'text-[11px]'} style={{ color: metaColor }}>
          {count} vote{count !== 1 ? 's' : ''}
        </span>
      )}
      {interactive && !userId && (
        <span className={large ? 'text-xs' : dense ? 'text-[9px]' : 'text-[10px]'} style={{ color: signInColor }}>
          Sign in to rate
        </span>
      )}
    </div>
  );
}
