import { useCallback, useEffect, useRef, useState } from 'react';
import { playRetroKeyClick } from './menuSounds';

/** Characters that get an extra beat before the next glyph (sentence / clause breath). */
const SENTENCE_PAUSE_AFTER = new Set(['.', '!', '?', '…', '。']);
/** Shorter breath after commas / clause punctuation (before the next glyph). */
const CLAUSE_PAUSE_AFTER = new Set([',', '，', ';']);

/** One shared pacing for intro welcome line, NPC lines, school beats, etc. (~4× relaxed vs old 28/320). */
export const STORY_TYPING_CHAR_DELAY_MS = 112;
export const STORY_TYPING_SENTENCE_PAUSE_MS = 1280;

/** Typed text + click-to-skip for story / dialogue beats (one beat = one `beatKey`). */
export function useStoryBeatTyping(
  fullText: string,
  beatKey: string | number,
  charDelayMs = STORY_TYPING_CHAR_DELAY_MS,
  sentencePauseMs = STORY_TYPING_SENTENCE_PAUSE_MS,
  enabled = true
) {
  const safeText = fullText ?? '';
  const [typedLen, setTypedLen] = useState(0);
  const [revealAll, setRevealAll] = useState(false);
  /** Tracks last len we played a click for — sound runs after paint so it lines up with the glyph. */
  const prevTypedLenSoundRef = useRef(0);
  /** Pending timer id for the next character reveal (so skip/reset can cancel immediately). */
  const typingTimerRef = useRef<number | null>(null);

  useEffect(() => {
    prevTypedLenSoundRef.current = 0;
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setTypedLen(0);
    setRevealAll(false);
  }, [beatKey]);

  useEffect(() => {
    if (!enabled || revealAll) return;
    const n = safeText.length;
    if (typedLen >= n) return;
    const prev = typedLen > 0 ? safeText[typedLen - 1] : '';
    const clausePauseMs = Math.max(220, Math.round(sentencePauseMs * 0.28));
    let pauseAfterPrev = 0;
    if (prev && SENTENCE_PAUSE_AFTER.has(prev)) pauseAfterPrev = sentencePauseMs;
    else if (prev && CLAUSE_PAUSE_AFTER.has(prev)) pauseAfterPrev = clausePauseMs;
    const id = window.setTimeout(() => {
      setTypedLen((l) => {
        if (l >= n) return l;
        return Math.min(l + 1, n);
      });
    }, charDelayMs + pauseAfterPrev);
    typingTimerRef.current = id;
    return () => {
      window.clearTimeout(id);
      if (typingTimerRef.current === id) typingTimerRef.current = null;
    };
  }, [safeText, typedLen, revealAll, charDelayMs, sentencePauseMs, enabled]);

  useEffect(() => {
    if (revealAll) {
      prevTypedLenSoundRef.current = typedLen;
      return;
    }
    const prev = prevTypedLenSoundRef.current;
    if (typedLen < prev) {
      prevTypedLenSoundRef.current = typedLen;
      return;
    }
    if (typedLen === prev + 1) {
      const ch = safeText[typedLen - 1];
      playRetroKeyClick(ch, { gainScale: 0.62 });
    }
    prevTypedLenSoundRef.current = typedLen;
  }, [typedLen, revealAll, safeText]);

  const skipTyping = useCallback(() => {
    if (typingTimerRef.current != null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setRevealAll(true);
    setTypedLen(safeText.length);
    prevTypedLenSoundRef.current = safeText.length;
  }, [safeText.length]);

  const typingDone = revealAll || typedLen >= safeText.length;
  const displayed = revealAll ? safeText : safeText.slice(0, typedLen);

  return { displayed, typingDone, skipTyping, showCaret: !typingDone && safeText.length > 0 };
}

/** Radix DialogContent overrides: anchored near bottom, no vertical centering. */
export const storyBeatDialogContentClassName =
  'fixed left-1/2 bottom-4 top-auto z-50 flex max-h-[min(44vh,540px)] min-h-0 w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none -translate-x-1/2 translate-y-0 data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100 sm:max-w-2xl';
