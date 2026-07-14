// ══════════════════════════════════════════════════
//  DATABASE (Firestore access layer)
//  Every read/write the game needs goes through here so
//  game.js never talks to the Firestore SDK directly.
//
//  Collections used (see firestore.rules / README):
//    leaderboard/{clanKey}   -> aggregate clan stats
//    players/{playerId}      -> one doc per logged-in player/device
// ══════════════════════════════════════════════════
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc, onSnapshot, increment, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { CLANS } from './questions.js';

const LEADERBOARD_COL = 'leaderboard';
const PLAYERS_COL = 'players';
const PLAYER_ID_KEY = 'billiards_player_id_v1';

// ── Empty stat shape, used to seed a clan's leaderboard doc ──
export function createEmptyClanStats() {
  return {
    games: 0, wins: 0, losses: 0,
    playerPooled: 0, cpuPooled: 0, totalPooled: 0,
    ballsPotted: 0, correctAnswers: 0, wrongAnswers: 0
  };
}

// ── Make sure every clan has a leaderboard doc so the admin
//    dashboard / onSnapshot listeners never see "missing" clans ──
export async function ensureLeaderboardDocs() {
  const jobs = Object.keys(CLANS).map(async (clanKey) => {
    const ref = doc(db, LEADERBOARD_COL, clanKey);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { clan: clanKey, ...createEmptyClanStats() });
    }
  });
  await Promise.all(jobs);
}

// ── Live subscription: fires cb(map) whenever any clan's stats change ──
export function subscribeLeaderboard(cb) {
  const unsubs = Object.keys(CLANS).map((clanKey) => {
    const ref = doc(db, LEADERBOARD_COL, clanKey);
    return onSnapshot(ref, (snap) => {
      cb(clanKey, snap.exists() ? snap.data() : createEmptyClanStats());
    });
  });
  return () => unsubs.forEach((u) => u());
}

// ── Record balls potted by either side during the current match ──
export async function recordPooledBalls(clanKey, actor, count) {
  if (!clanKey || !count) return;
  const ref = doc(db, LEADERBOARD_COL, clanKey);
  const field = actor === 0 ? 'playerPooled' : 'cpuPooled';
  await updateDoc(ref, {
    [field]: increment(count),
    totalPooled: increment(count),
    ballsPotted: increment(count)
  }).catch(async () => {
    // doc didn't exist yet - seed then retry once
    await setDoc(ref, { clan: clanKey, ...createEmptyClanStats() }, { merge: true });
    await updateDoc(ref, {
      [field]: increment(count),
      totalPooled: increment(count),
      ballsPotted: increment(count)
    });
  });
}

// ── Record a finished match result (player's clan vs opponent clan) ──
export async function recordMatchResult(clanKey, playerWon) {
  if (!clanKey) return;
  const ref = doc(db, LEADERBOARD_COL, clanKey);
  await updateDoc(ref, {
    games: increment(1),
    wins: increment(playerWon ? 1 : 0),
    losses: increment(playerWon ? 0 : 1)
  });
}

// ── Quiz accuracy tracking (per clan, aggregate) ──
export async function recordQuizAnswer(clanKey, correct) {
  if (!clanKey) return;
  const ref = doc(db, LEADERBOARD_COL, clanKey);
  await updateDoc(ref, {
    correctAnswers: increment(correct ? 1 : 0),
    wrongAnswers: increment(correct ? 0 : 1)
  });
}

// ── Player identity (no Firebase Auth in this phase — see README) ──
export function getOrCreatePlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = 'p_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

// ── Called on successful clan login: persists session + writes/updates the player doc ──
export async function loginPlayer(clanKey, playerName = 'Player') {
  const playerId = getOrCreatePlayerId();
  const ref = doc(db, PLAYERS_COL, playerId);
  await setDoc(ref, {
    name: playerName,
    clan: clanKey,
    online: true,
    lastSeen: serverTimestamp()
  }, { merge: true });

  sessionStorage.setItem('billiards_clan_login_v1', JSON.stringify({ clanKey, playerId, ts: Date.now() }));
  return playerId;
}

// ── Read back a stored login (so a refresh doesn't force re-login mid-session) ──
export function getStoredLogin() {
  try {
    const raw = sessionStorage.getItem('billiards_clan_login_v1');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredLogin() {
  sessionStorage.removeItem('billiards_clan_login_v1');
}

export async function setPlayerOnlineStatus(online) {
  const raw = getStoredLogin();
  if (!raw) return;
  const ref = doc(db, PLAYERS_COL, raw.playerId);
  await updateDoc(ref, { online, lastSeen: serverTimestamp() }).catch(() => {});
}
