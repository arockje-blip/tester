// ══════════════════════════════════════════════════
//  ADMIN — LOGIN GATE + LIVE CLAN LEADERBOARD
//
//  Phase 1 (login gate) is unchanged from before.
//
//  Phase 2 (this update): once signed in, the dashboard
//  renders the same "Clan Leaderboard Portal" table the
//  game shows via its in-match ADMIN button, reading the
//  same localStorage key the game writes to
//  ('billiards_clan_leaderboard_v1'). Match-specific info
//  (current/opponent clan, this-match drop tubes) only
//  exists inside an active game session, so those pieces
//  are replaced here with dashboard-wide totals + a
//  Leading Clan card, which make sense on a standalone
//  admin page.
//
//  NOTE ON SECURITY: same as before — credentials are
//  checked client-side. For real production use, move
//  this to a Cloud Function / Firebase custom-claim check
//  and lock the `leaderboard`/`players` collections down
//  with firestore.rules.
//
//  NOTE ON DATA SOURCE: the game currently persists the
//  leaderboard to localStorage (not yet wired to
//  Firestore via database.js/firebase.js — that's still
//  Phase 3 work), so this dashboard reads from the same
//  localStorage key to stay in sync with real game data.
// ══════════════════════════════════════════════════

const ADMIN_USER = 'AJ_encoded';
const ADMIN_PASS = '19782004';
const SESSION_KEY = 'billiards_admin_session_v1';
const LB_KEY = 'billiards_clan_leaderboard_v1';

// Keep in sync with the CLANS object in game.html.
const CLANS = {
  aura7f:   { name: 'Aura7F',   badge: '⚡',  logo: 'images/clans/aura.jpg' },
  belmonts: { name: 'Belmonts', badge: '🏔️', logo: 'images/clans/belmonts.jpg' },
  lumina:   { name: 'Lumina',   badge: '☀️',  logo: 'images/clans/lumina.jpg' },
  adepti:   { name: 'Adepti',   badge: '✨',  logo: 'images/clans/adepti.jpg' }
};

function createEmptyClanStats() {
  return { games: 0, wins: 0, losses: 0, playerPooled: 0, cpuPooled: 0, totalPooled: 0 };
}

function loadLeaderboard() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LB_KEY) || '{}');
    for (const key of Object.keys(CLANS)) {
      if (!parsed[key]) parsed[key] = createEmptyClanStats();
    }
    return parsed;
  } catch {
    const fallback = {};
    for (const key of Object.keys(CLANS)) fallback[key] = createEmptyClanStats();
    return fallback;
  }
}

function renderDashboard() {
  const leaderboard = loadLeaderboard();
  const body = document.getElementById('admin-body');
  body.innerHTML = '';

  let totalGames = 0, totalWins = 0, totalPooled = 0;
  let leader = null;

  Object.entries(CLANS).forEach(([key, clan]) => {
    const stat = leaderboard[key] || createEmptyClanStats();
    totalGames += stat.games;
    totalWins += stat.wins;
    totalPooled += stat.totalPooled;

    if (!leader || stat.wins > leader.wins ||
        (stat.wins === leader.wins && stat.totalPooled > leader.totalPooled)) {
      leader = { name: clan.name, wins: stat.wins, totalPooled: stat.totalPooled };
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="clan-cell">
          <img class="clan-logo" src="${clan.logo}" alt="${clan.name}" onerror="this.style.display='none'">
          <span class="clan-name">${clan.badge} ${clan.name}</span>
        </div>
      </td>
      <td>${stat.games}</td>
      <td>${stat.wins}</td>
      <td>${stat.losses}</td>
      <td>${stat.playerPooled}</td>
      <td>${stat.cpuPooled}</td>
      <td>${stat.totalPooled}</td>
    `;
    body.appendChild(row);
  });

  document.getElementById('admin-total-games').textContent = String(totalGames);
  document.getElementById('admin-total-wins').textContent = String(totalWins);
  document.getElementById('admin-total-pooled').textContent = String(totalPooled);
  document.getElementById('admin-leading-clan').textContent =
    leader && leader.wins > 0 ? leader.name : '-';

  document.getElementById('admin-empty').style.display = totalGames > 0 ? 'none' : 'block';
}

function showDashboard() {
  document.getElementById('admin-login-wrap').style.display = 'none';
  document.getElementById('dashboard-placeholder').style.display = 'block';
  renderDashboard();
}

function showLogin() {
  document.getElementById('admin-login-wrap').style.display = 'flex';
  document.getElementById('dashboard-placeholder').style.display = 'none';
}

function tryLogin() {
  const user = document.getElementById('admin-user').value.trim();
  const pass = document.getElementById('admin-pass').value;
  const err = document.getElementById('admin-err');

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, '1');
    showDashboard();
  } else {
    err.textContent = 'Invalid admin credentials.';
  }
}

function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  showLogin();
}

document.getElementById('admin-login-btn').addEventListener('click', tryLogin);
document.getElementById('admin-pass').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryLogin();
});
document.getElementById('admin-signout').addEventListener('click', signOut);

// Live-ish refresh: if a game finishes in another tab (same origin),
// the browser fires 'storage' here so the table updates without a reload.
window.addEventListener('storage', (e) => {
  if (e.key === LB_KEY && sessionStorage.getItem(SESSION_KEY) === '1') {
    renderDashboard();
  }
});

// Restore an existing admin session on refresh.
if (sessionStorage.getItem(SESSION_KEY) === '1') {
  showDashboard();
}
