// SportShield Extension — Popup Script

const API_BASE = 'http://localhost:8000/api/media';

document.addEventListener('DOMContentLoaded', async () => {
  // Load stats
  try {
    const [radarRes, crowdRes, profileRes] = await Promise.all([
      fetch(`${API_BASE}/radar/stats`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/crowd/stats`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/crowd/contributors/demo_user`).then(r => r.json()).catch(() => null),
    ]);

    if (radarRes) {
      document.getElementById('stat-events').textContent = radarRes.active_events || 0;
      document.getElementById('stat-pirates').textContent = radarRes.pirate_streams_found || 0;
      document.getElementById('stat-suspects').textContent = radarRes.total_suspects_analyzed || 0;
    }

    if (profileRes && !profileRes.detail) {
      document.getElementById('stat-points').textContent = profileRes.total_points || 0;
      const rank = profileRes.rank || 'scout';
      document.getElementById('rank-badge').textContent = rank.charAt(0).toUpperCase() + rank.slice(1);
      document.getElementById('rank-info').textContent =
        `${profileRes.verified_finds || 0} verified finds • ${profileRes.submissions || 0} reports`;
    }
  } catch (e) {
    // API not reachable
  }

  // Scan Page button
  document.getElementById('btn-scan-page').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      chrome.tabs.sendMessage(tab.id, { action: 'scanPageImages' });
      window.close();
    }
  });

  // Report Page button
  document.getElementById('btn-report').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      try {
        const result = await fetch(`${API_BASE}/crowd/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suspectUrl: tab.url,
            eventName: '',
            platform: '',
            description: `Reported via extension: ${tab.title}`,
          }),
        });
        if (result.ok) {
          const btn = document.getElementById('btn-report');
          btn.querySelector('div > div:first-child').textContent = 'Reported!';
          btn.style.borderColor = 'rgba(74,222,128,0.4)';
          setTimeout(() => window.close(), 1500);
        }
      } catch (e) {
        // Silent
      }
    }
  });

  // Open War Room
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/radar' });
    window.close();
  });

  // Open Leaderboard
  document.getElementById('btn-leaderboard').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/radar' });
    window.close();
  });
});
