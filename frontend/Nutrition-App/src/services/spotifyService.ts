/**
 * Spotify service — Web API + manual PKCE OAuth.
 * Pure JS: no native modules, works in Expo Go.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

// ─── Constants ────────────────────────────────────────────────────────────────
const CLIENT_ID = '09d3fca81b77405080b871dc84cc0f1c';
const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ');

const TOKEN_KEY = 'spotify_access_token';
const TOKEN_EXPIRY_KEY = 'spotify_token_expiry';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';

// ─── Types ────────────────────────────────────────────────────────────────────
export type SpotifyRepeatMode = 'off' | 'track' | 'context';

export interface SpotifyPlayerState {
  trackName: string;
  artistName: string;
  albumArtUrl: string | null;
  isPaused: boolean;
  positionMs: number;
  durationMs: number;
  shuffleEnabled: boolean;
  repeatMode: SpotifyRepeatMode;
}

// ─── Pure-JS SHA-256 (no native crypto needed) ────────────────────────────────
function rotr32(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
}

function sha256(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = data.length;
  const bitLen = len * 8;
  const padLen = (len + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(data);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000), false);
  dv.setUint32(padLen - 4, bitLen >>> 0, false);

  for (let i = 0; i < padLen; i += 64) {
    const W = new Uint32Array(64);
    const chunk = new DataView(padded.buffer, i, 64);
    for (let j = 0; j < 16; j++) W[j] = chunk.getUint32(j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr32(W[j - 15], 7) ^ rotr32(W[j - 15], 18) ^ (W[j - 15] >>> 3);
      const s1 = rotr32(W[j - 2], 17) ^ rotr32(W[j - 2], 19) ^ (W[j - 2] >>> 10);
      W[j] = (W[j - 16] + s0 + W[j - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + W[j]) >>> 0;
      const S0 = rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const out = new DataView(result.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => out.setUint32(i * 4, v, false));
  return result;
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────
function base64urlEncode(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function randomBytes(count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  for (let i = 0; i < count; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
}

function generatePKCE(): { verifier: string; challenge: string } {
  const verifierBytes = randomBytes(32);
  const verifier = base64urlEncode(verifierBytes);
  const challengeBytes = sha256(new TextEncoder().encode(verifier));
  const challenge = base64urlEncode(challengeBytes);
  return { verifier, challenge };
}

// ─── Token helpers ────────────────────────────────────────────────────────────
async function getValidToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) return refreshAccessToken();
  return token;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshTkn = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshTkn) return null;

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshTkn,
        client_id: CLIENT_ID,
      }).toString(),
    });
    const data = await res.json();
    if (!data.access_token) return null;

    const expiryMs = Date.now() + data.expires_in * 1000;
    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiryMs));
    if (data.refresh_token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

async function apiCall(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<Response | null> {
  const token = await getValidToken();
  if (!token) return null;
  return fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const spotifyService = {
  /** Log this on first run to get the URI to add to Spotify Dashboard. */
  getRedirectUri(): string {
    return Linking.createURL('spotify-callback');
  },

  async connect(): Promise<boolean> {
    try {
      const redirectUri = Linking.createURL('spotify-callback');
      console.log('[Spotify] redirect URI:', redirectUri);

      const { verifier, challenge } = generatePKCE();
      console.log('[Spotify] PKCE generated');

      const authUrl =
        `https://accounts.spotify.com/authorize` +
        `?client_id=${CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent(SCOPES)}` +
        `&code_challenge_method=S256` +
        `&code_challenge=${challenge}`;

      console.log('[Spotify] opening browser...');
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      console.log('[Spotify] browser result:', result.type);

      if (result.type !== 'success') return false;

      console.log('[Spotify] redirect URL:', result.url);
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      console.log('[Spotify] code present:', !!code);
      if (!code) return false;

      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: CLIENT_ID,
          code_verifier: verifier,
        }).toString(),
      });
      const tokenData = await tokenRes.json();
      console.log('[Spotify] token exchange status:', tokenRes.status, tokenData.error ?? 'ok');
      if (!tokenData.access_token) return false;

      const expiryMs = Date.now() + tokenData.expires_in * 1000;
      await SecureStore.setItemAsync(TOKEN_KEY, tokenData.access_token);
      await SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(expiryMs));
      if (tokenData.refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokenData.refresh_token);
      }
      console.log('[Spotify] connected successfully');
      return true;
    } catch (e) {
      console.error('[Spotify] connect error:', e);
      return false;
    }
  },

  async disconnect(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },

  async isConnected(): Promise<boolean> {
    return (await getValidToken()) !== null;
  },

  async getPlayerState(): Promise<SpotifyPlayerState | null> {
    try {
      const res = await apiCall('GET', '/me/player');
      if (!res || res.status === 204 || res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.item) return null;

      const artists: Array<{ name: string }> = data.item.artists ?? [];
      const images: Array<{ url: string }> = data.item.album?.images ?? [];

      return {
        trackName: data.item.name ?? 'Unknown',
        artistName: artists.map((a) => a.name).join(', ') || 'Unknown',
        albumArtUrl: images[0]?.url ?? null,
        isPaused: !data.is_playing,
        positionMs: data.progress_ms ?? 0,
        durationMs: data.item.duration_ms ?? 0,
        shuffleEnabled: data.shuffle_state ?? false,
        repeatMode: (data.repeat_state as SpotifyRepeatMode) ?? 'off',
      };
    } catch {
      return null;
    }
  },

  async togglePlayPause(isPaused: boolean): Promise<void> {
    try { await apiCall('PUT', isPaused ? '/me/player/play' : '/me/player/pause'); } catch { /* ignore */ }
  },

  async skipToNext(): Promise<void> {
    try { await apiCall('POST', '/me/player/next'); } catch { /* ignore */ }
  },

  async skipToPrevious(): Promise<void> {
    try { await apiCall('POST', '/me/player/previous'); } catch { /* ignore */ }
  },

  async seek(positionMs: number): Promise<void> {
    try { await apiCall('PUT', `/me/player/seek?position_ms=${Math.round(positionMs)}`); } catch { /* ignore */ }
  },

  async setShuffle(enabled: boolean): Promise<void> {
    try { await apiCall('PUT', `/me/player/shuffle?state=${enabled}`); } catch { /* ignore */ }
  },

  async setRepeatMode(mode: SpotifyRepeatMode): Promise<void> {
    try { await apiCall('PUT', `/me/player/repeat?state=${mode}`); } catch { /* ignore */ }
  },

  cycleRepeatMode(current: SpotifyRepeatMode): SpotifyRepeatMode {
    if (current === 'off') return 'context';
    if (current === 'context') return 'track';
    return 'off';
  },
};
