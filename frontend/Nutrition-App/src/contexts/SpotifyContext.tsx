import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { spotifyService, SpotifyPlayerState, SpotifyRepeatMode } from '@/src/services/spotifyService';

interface SpotifyContextValue {
  isConnected: boolean;
  playerState: SpotifyPlayerState | null;
  isSeeking: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  onSeekStart: () => void;
  onSeekEnd: (positionMs: number) => Promise<void>;
  toggleShuffle: () => Promise<void>;
  cycleRepeatMode: () => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextValue | null>(null);

export function SpotifyProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [playerState, setPlayerState] = useState<SpotifyPlayerState | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // ref copy prevents stale closure in the interval callback from snapping the seek bar
  const isSeekingRef = useRef(false);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (isSeekingRef.current) return;
      const state = await spotifyService.getPlayerState();
      setPlayerState(state);
    }, 1000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    spotifyService.isConnected().then((connected) => {
      if (connected) {
        setIsConnected(true);
        startPolling();
      }
    });
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  const connect = useCallback(async () => {
    const ok = await spotifyService.connect();
    if (ok) {
      setIsConnected(true);
      startPolling();
    } else {
      throw new Error('Spotify connection failed');
    }
  }, [startPolling]);

  const disconnect = useCallback(async () => {
    stopPolling();
    await spotifyService.disconnect();
    setIsConnected(false);
    setPlayerState(null);
  }, [stopPolling]);

  const togglePlayPause = useCallback(async () => {
    if (!playerState) return;
    await spotifyService.togglePlayPause(playerState.isPaused);
    // Optimistic update
    setPlayerState((prev) => prev ? { ...prev, isPaused: !prev.isPaused } : prev);
  }, [playerState]);

  const skipToNext = useCallback(async () => {
    await spotifyService.skipToNext();
    // Let poll pick up the new track
    setTimeout(async () => {
      const state = await spotifyService.getPlayerState();
      setPlayerState(state);
    }, 500);
  }, []);

  const skipToPrevious = useCallback(async () => {
    await spotifyService.skipToPrevious();
    setTimeout(async () => {
      const state = await spotifyService.getPlayerState();
      setPlayerState(state);
    }, 500);
  }, []);

  const onSeekStart = useCallback(() => {
    setIsSeeking(true);
    isSeekingRef.current = true;
  }, []);

  const onSeekEnd = useCallback(async (positionMs: number) => {
    await spotifyService.seek(positionMs);
    isSeekingRef.current = false;
    setIsSeeking(false);
    // Sync immediately after seek
    const state = await spotifyService.getPlayerState();
    setPlayerState(state);
  }, []);

  const toggleShuffle = useCallback(async () => {
    if (!playerState) return;
    const next = !playerState.shuffleEnabled;
    await spotifyService.setShuffle(next);
    setPlayerState((prev) => prev ? { ...prev, shuffleEnabled: next } : prev);
  }, [playerState]);

  const cycleRepeatMode = useCallback(async () => {
    if (!playerState) return;
    const next: SpotifyRepeatMode = spotifyService.cycleRepeatMode(playerState.repeatMode);
    await spotifyService.setRepeatMode(next);
    setPlayerState((prev) => prev ? { ...prev, repeatMode: next } : prev);
  }, [playerState]);

  return (
    <SpotifyContext.Provider
      value={{
        isConnected,
        playerState,
        isSeeking,
        connect,
        disconnect,
        togglePlayPause,
        skipToNext,
        skipToPrevious,
        onSeekStart,
        onSeekEnd,
        toggleShuffle,
        cycleRepeatMode,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotify(): SpotifyContextValue {
  const ctx = useContext(SpotifyContext);
  if (!ctx) throw new Error('useSpotify must be used inside SpotifyProvider');
  return ctx;
}
