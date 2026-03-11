'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFoco } from '@/lib/store';
import { generateSovereignVoice } from '@/ai/flows/sovereign-voice-flow';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const LATE_OPEN_REMAINING_HOURS_THRESHOLD = 2;
const LATE_OPEN_FOCUS_MAX_HOURS = 0.5;
const BACKGROUND_DRILL_NOTIFICATION_MINUTES = 10;
const MIN_MINUTES_AWAY_TO_TRIGGER = 0.5;
const SGT_REQUEST_TIMEOUT_MS = 15_000;
const SGT_QUOTA_TOAST_COOLDOWN_MS = 5 * 60 * 1000; // show quota toast at most once per 5 min
const SGT_TIMEOUT_TOAST_COOLDOWN_MS = 5 * 60 * 1000; // same for timeout toast
const SGT_MODE_CHANGE_DEBOUNCE_MS = 3000; // min interval between mode_change triggers

// System notifications (Notification API) show pop-ups when the app is in foreground or when user returns.
// When tab is hidden with SEAL on, a timer fires after 10 min to show a drill notification (browser may throttle).
// For push when app is fully closed, integrate FCM (Firebase Cloud Messaging) and a backend to send payloads.

type VoiceEvent = 'mode_change' | 'background_return' | 'late_open' | 'periodic_check' | 'manual';
type TriggerContext = {
  minutesAway?: number;
  focusWasActive?: boolean;
};

function getLateOpenFiredDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sgt_late_open_fired_date');
}

function setLateOpenFiredDate(dateStr: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('sgt_late_open_fired_date', dateStr);
}

function shouldShowQuotaToast(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = sessionStorage.getItem('sgt_quota_toast_at');
  if (!raw) return true;
  const at = Number(raw);
  if (Number.isNaN(at)) return true;
  return Date.now() - at > SGT_QUOTA_TOAST_COOLDOWN_MS;
}

function markQuotaToastShown() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('sgt_quota_toast_at', String(Date.now()));
}

function shouldShowTimeoutToast(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = sessionStorage.getItem('sgt_timeout_toast_at');
  if (!raw) return true;
  const at = Number(raw);
  if (Number.isNaN(at)) return true;
  return Date.now() - at > SGT_TIMEOUT_TOAST_COOLDOWN_MS;
}

function markTimeoutToastShown() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('sgt_timeout_toast_at', String(Date.now()));
}

export function SovereignVoice() {
  const {
    lifeTracker,
    intensityRequired,
    isCritical,
    assets,
    currentVitality,
    remainingCycleHours,
    assetAnalytics,
    dailyStats,
    dailyTargetHours,
  } = useFoco();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lifeTrackerRef = useRef(lifeTracker);
  const hiddenAtRef = useRef<number | null>(null);
  const focusWasActiveWhenHiddenRef = useRef(false);
  const backgroundDrillTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lateOpenFiredRef = useRef(false);
  const mountedRef = useRef(true);
  const lastModeChangeAtRef = useRef<number>(0);

  lifeTrackerRef.current = lifeTracker;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      setIsLoading(false);
    };
  }, []);

  const showSystemNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (notificationPermission !== 'granted') return;
    try {
      new Notification(title, { body });
    } catch (_) {}
  }, [notificationPermission]);

  const triggerVoice = useCallback(async (event: VoiceEvent, context?: TriggerContext) => {
    if (!isInitialized || isLoading || isPlaying) return;
    setIsLoading(true);
    try {
      const activeAsset = assets.find((a) => a.id === lifeTracker.activeAssetId);
      const focusLoggedTodayHours = dailyStats.focus / 3600;
      const payload = {
        mode: lifeTracker.activeMode,
        intensity: intensityRequired,
        assetName: activeAsset?.name || 'unspecified',
        debtHours: assets.reduce((acc, a) => acc + assetAnalytics(a.id).debtHours, 0),
        vitality: currentVitality,
        remainingHours: remainingCycleHours,
        event,
        ...(context?.minutesAway != null && { minutesAway: context.minutesAway }),
        ...(context?.focusWasActive != null && { focusWasActiveWhenHidden: context.focusWasActive }),
        focusLoggedTodayHours,
        dailyTargetHours,
      };
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), SGT_REQUEST_TIMEOUT_MS);
      });
      const result = await Promise.race([generateSovereignVoice(payload), timeoutPromise]);
      if (result.transcript) {
        const title = event === 'background_return' || event === 'late_open' ? 'INTERROGATION' : 'DIRECTIVE';
        toast({
          title,
          description: result.transcript,
          variant: 'elegant',
        });
        showSystemNotification(title, result.transcript);
        if (result.audioUri && audioRef.current && mountedRef.current) {
          audioRef.current.src = result.audioUri;
          audioRef.current.play().catch((e) => console.warn('Audio play blocked', e));
          if (mountedRef.current) setIsPlaying(true);
        }
      } else if (result.error) {
        const isQuota = result.error === 'QUOTA_EXCEEDED_TEXT' || result.error === 'QUOTA_EXCEEDED_AUDIO';
        const quotaTranscript = (result as { transcript?: string }).transcript;

        if (isQuota) {
          // User never sees "limit exceeded"; show the directive (transcript or fallback) instead.
          if (quotaTranscript) {
            const title = event === 'background_return' || event === 'late_open' ? 'INTERROGATION' : 'DIRECTIVE';
            toast({ title, description: quotaTranscript, variant: 'elegant' });
            showSystemNotification(title, quotaTranscript);
          } else if (shouldShowQuotaToast()) {
            markQuotaToastShown();
            const fallbackDirective = 'Focus. Execute. Now.';
            toast({ title: 'DIRECTIVE', description: fallbackDirective, variant: 'elegant' });
            showSystemNotification('DIRECTIVE', fallbackDirective);
          }
        } else {
          const isNoAudio = result.error === 'AUDIO_GENERATION_FAILED' || result.error === 'NO_AUDIO_GENERATED';
          const message = result.error === 'MISSING_API_KEY'
            ? 'Diretiva indisponível.'
            : result.error === 'NO_TEXT_GENERATED'
              ? 'Diretiva indisponível.'
              : isNoAudio
                ? (result as { transcript?: string }).transcript ?? 'Diretiva sem áudio.'
                : 'Tenta novamente mais tarde.';
          toast({
            title: isNoAudio ? 'DIRECTIVE' : 'DIRECTIVE',
            description: message,
            variant: 'elegant',
          });
        }
      }
    } catch (e) {
      const isTimeout = e instanceof Error && e.message === 'TIMEOUT';
      console.error('Sovereign Voice Error', e);
      if (isTimeout && !shouldShowTimeoutToast()) {
        // Throttle timeout toast
      } else {
        if (isTimeout) markTimeoutToastShown();
        toast({
          title: 'DIRECTIVE',
          description: isTimeout
            ? 'A resposta demorou. Tenta novamente.'
            : 'Diretiva indisponível. Tenta mais tarde.',
          variant: 'elegant',
        });
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [isInitialized, isLoading, isPlaying, lifeTracker, intensityRequired, assets, currentVitality, remainingCycleHours, assetAnalytics, dailyStats.focus, dailyTargetHours, toast, showSystemNotification]);

  useEffect(() => {
    if (!isInitialized) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        focusWasActiveWhenHiddenRef.current = lifeTrackerRef.current.activeMode === 'focus';
        if (focusWasActiveWhenHiddenRef.current) {
          backgroundDrillTimerRef.current = setTimeout(() => {
            backgroundDrillTimerRef.current = null;
            showSystemNotification(
              'SGT DRILL',
              'You left presence running. Return to seal or stop the clock. Now.'
            );
          }, BACKGROUND_DRILL_NOTIFICATION_MINUTES * 60 * 1000);
        }
      } else {
        if (backgroundDrillTimerRef.current) {
          clearTimeout(backgroundDrillTimerRef.current);
          backgroundDrillTimerRef.current = null;
        }
        const hiddenAt = hiddenAtRef.current;
        const focusWasActive = focusWasActiveWhenHiddenRef.current;
        hiddenAtRef.current = null;

        const now = Date.now();
        const minutesAway = hiddenAt != null ? (now - hiddenAt) / 60000 : 0;
        let didTriggerReturn = false;

        if (focusWasActive && minutesAway >= MIN_MINUTES_AWAY_TO_TRIGGER) {
          triggerVoice('background_return', { minutesAway, focusWasActive: true });
          didTriggerReturn = true;
        } else if (!focusWasActive && minutesAway >= MIN_MINUTES_AWAY_TO_TRIGGER && isCritical) {
          triggerVoice('background_return', { minutesAway, focusWasActive: false });
          didTriggerReturn = true;
        }

        if (!didTriggerReturn) {
          const focusLoggedTodayHours = dailyStats.focus / 3600;
          const todayStr = new Date().toDateString();
          const lastFired = getLateOpenFiredDate();
          if (
            remainingCycleHours <= LATE_OPEN_REMAINING_HOURS_THRESHOLD &&
            focusLoggedTodayHours < LATE_OPEN_FOCUS_MAX_HOURS &&
            lastFired !== todayStr
          ) {
            lateOpenFiredRef.current = true;
            setLateOpenFiredDate(todayStr);
            triggerVoice('late_open');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (backgroundDrillTimerRef.current) {
        clearTimeout(backgroundDrillTimerRef.current);
        backgroundDrillTimerRef.current = null;
      }
    };
  }, [isInitialized, isCritical, remainingCycleHours, dailyStats.focus, triggerVoice, showSystemNotification]);

  useEffect(() => {
    if (!isInitialized) return;
    const now = Date.now();
    if (now - lastModeChangeAtRef.current < SGT_MODE_CHANGE_DEBOUNCE_MS) return;
    lastModeChangeAtRef.current = now;
    triggerVoice('mode_change');
  }, [isInitialized, lifeTracker.activeMode, triggerVoice]);

  const handleInit = useCallback(() => {
    setIsInitialized(true);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => setNotificationPermission(p));
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  return (
    <div className="flex items-center gap-4">
      <audio ref={audioRef} onEnded={() => setIsPlaying(false)} className="hidden" />
      {!isInitialized ? (
        <button
          onClick={handleInit}
          aria-label="Initialize Sovereign Guard Tower – enable voice and notifications"
          className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 border border-white/5 transition-all group"
        >
          <EyeOff size={10} className="opacity-20 group-hover:opacity-100" />
          <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-30 group-hover:opacity-100">
            Initialize SGT
          </span>
        </button>
      ) : (
        <button
          onClick={() => triggerVoice('manual')}
          aria-label={isLoading ? 'A carregar voz SGT…' : 'Trigger Sovereign Guard Tower voice briefing'}
          aria-busy={isLoading}
          disabled={isLoading}
          className={cn(
            'w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-700',
            isPlaying
              ? 'scale-110 border-destructive text-destructive bg-destructive/5 shadow-[0_0_20px_rgba(255,0,0,0.1)]'
              : isLoading
                ? 'opacity-70 border-primary/30 cursor-wait'
                : 'opacity-30 hover:opacity-100 border-white/10 hover:border-primary/40'
          )}
        >
          {isLoading ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Eye size={12} />}
        </button>
      )}
    </div>
  );
}
