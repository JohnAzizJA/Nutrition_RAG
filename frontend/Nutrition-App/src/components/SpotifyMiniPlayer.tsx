import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/src/components/themed-text';
import { Colors } from '@/constants/theme';
import { SpotifyPlayerState, SpotifyRepeatMode } from '@/src/services/spotifyService';

// Spotify brand green — required by Spotify Brand Guidelines
const SPOTIFY_GREEN = '#1DB954';

interface Props {
  playerState: SpotifyPlayerState;
  isSeeking: boolean;
  onTogglePlayPause: () => void;
  onSkipNext: () => void;
  onSkipPrevious: () => void;
  onSeekStart: () => void;
  onSeekEnd: (positionMs: number) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onDisconnect: () => void;
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function SpotifyMiniPlayer({
  playerState,
  isSeeking,
  onTogglePlayPause,
  onSkipNext,
  onSkipPrevious,
  onSeekStart,
  onSeekEnd,
  onToggleShuffle,
  onCycleRepeat,
  onDisconnect,
}: Props) {
  const [localPosition, setLocalPosition] = useState(playerState.positionMs);

  // Sync from poll only when user is not dragging
  useEffect(() => {
    if (!isSeeking) {
      setLocalPosition(playerState.positionMs);
    }
  }, [playerState.positionMs, isSeeking]);

  const repeatActive = playerState.repeatMode !== 'off';

  return (
    <View style={styles.container}>
      {/* Row 1: Track info */}
      <View style={styles.trackRow}>
        {/* Album art */}
        {playerState.albumArtUrl ? (
          <Image source={{ uri: playerState.albumArtUrl }} style={styles.albumArt} />
        ) : (
          <View style={styles.albumArtPlaceholder}>
            <Ionicons name="musical-notes" size={18} color={Colors.textMuted} />
          </View>
        )}

        {/* Track name + artist */}
        <View style={styles.trackInfo}>
          <ThemedText style={styles.trackName} numberOfLines={1}>
            {playerState.trackName}
          </ThemedText>
          <ThemedText style={styles.artistName} numberOfLines={1}>
            {playerState.artistName}
          </ThemedText>
        </View>

        {/* Spotify icon = disconnect button */}
        <TouchableOpacity onPress={onDisconnect} hitSlop={8}>
          <Ionicons name="musical-notes" size={22} color={SPOTIFY_GREEN} />
        </TouchableOpacity>
      </View>

      {/* Row 2: Seek bar */}
      <View style={styles.seekRow}>
        <ThemedText style={styles.timeText}>{formatMs(localPosition)}</ThemedText>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={playerState.durationMs || 1}
          value={localPosition}
          onSlidingStart={() => {
            setLocalPosition(playerState.positionMs);
            onSeekStart();
          }}
          onValueChange={(v) => setLocalPosition(v)}
          onSlidingComplete={(v) => onSeekEnd(v)}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.primary}
        />
        <ThemedText style={styles.timeText}>{formatMs(playerState.durationMs)}</ThemedText>
      </View>

      {/* Row 3: Controls */}
      <View style={styles.controlsRow}>
        {/* Shuffle */}
        <TouchableOpacity onPress={onToggleShuffle} hitSlop={8}>
          <Ionicons
            name="shuffle"
            size={20}
            color={playerState.shuffleEnabled ? Colors.primary : Colors.inactive}
          />
        </TouchableOpacity>

        {/* Previous */}
        <TouchableOpacity onPress={onSkipPrevious} hitSlop={8}>
          <Ionicons name="play-skip-back" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Play / Pause */}
        <TouchableOpacity onPress={onTogglePlayPause} style={styles.playBtn}>
          <Ionicons
            name={playerState.isPaused ? 'play' : 'pause'}
            size={22}
            color={Colors.white}
          />
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity onPress={onSkipNext} hitSlop={8}>
          <Ionicons name="play-skip-forward" size={24} color={Colors.text} />
        </TouchableOpacity>

        {/* Repeat */}
        <TouchableOpacity onPress={onCycleRepeat} hitSlop={8} style={styles.repeatBtn}>
          <Ionicons
            name="repeat"
            size={20}
            color={repeatActive ? Colors.primary : Colors.inactive}
          />
          {playerState.repeatMode === 'track' && (
            <View style={styles.repeatBadge}>
              <ThemedText style={styles.repeatBadgeText}>1</ThemedText>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 4,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  albumArt: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  albumArtPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  artistName: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  seekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slider: {
    flex: 1,
    height: 32,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textMuted,
    minWidth: 30,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBtn: {
    position: 'relative',
  },
  repeatBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatBadgeText: {
    fontSize: 8,
    color: Colors.white,
    fontWeight: '700',
  },
});
