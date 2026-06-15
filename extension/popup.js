const SITE_URL = 'https://sportshield--sportshield-app.us-central1.hosted.app';

document.addEventListener('DOMContentLoaded', () => {
  // Flag as Pirate Site
  document.getElementById('btn-flag').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // Store the flagged site locally
    const flagData = {
      url: tab.url,
      title: tab.title || '',
      flaggedAt: new Date().toISOString(),
    };

    chrome.storage.local.get({ flaggedSites: [] }, (data) => {
      const sites = data.flaggedSites;
      if (!sites.some((s) => s.url === flagData.url)) {
        sites.push(flagData);
        chrome.storage.local.set({ flaggedSites: sites });
      }
    });

    // Show success UI
    document.getElementById('main-view').style.display = 'none';
    const success = document.getElementById('flag-success');
    success.classList.add('visible');
    try {
      const host = new URL(tab.url).hostname;
      document.getElementById('flag-url').textContent = host;
    } catch {
      document.getElementById('flag-url').textContent = tab.url;
    }

    // Auto-close after 2s
    setTimeout(() => window.close(), 2000);
  });

  // Open War Room — goes to site login, then redirects to radar
  document.getElementById('btn-warroom').addEventListener('click', () => {
    chrome.tabs.create({ url: `${SITE_URL}/radar` });
    window.close();
  });

  // Open Dashboard
  document.getElementById('btn-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: SITE_URL });
    window.close();
  });

  // Footer link
  document.getElementById('footer-link').addEventListener('click', () => {
    chrome.tabs.create({ url: SITE_URL });
    window.close();
  });
});
