// SportShield Extension — Background Service Worker
// Handles context menus, badge updates, and API communication.

const API_BASE = 'http://localhost:8000/api/media';

// ── Context Menus ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Parent menu
  chrome.contextMenus.create({
    id: 'sportshield',
    title: 'SportShield',
    contexts: ['image', 'link', 'page', 'video', 'audio'],
  });

  // Protect actions
  chrome.contextMenus.create({
    id: 'ss-protect-image',
    parentId: 'sportshield',
    title: 'Protect this image (upload to SportShield)',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'ss-search-image',
    parentId: 'sportshield',
    title: 'Search this image against my library (CLIP)',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'ss-verify-c2pa',
    parentId: 'sportshield',
    title: 'Verify C2PA credentials',
    contexts: ['image'],
  });

  chrome.contextMenus.create({
    id: 'ss-check-watermark',
    parentId: 'sportshield',
    title: 'Check for forensic watermark',
    contexts: ['image'],
  });

  // Report actions
  chrome.contextMenus.create({
    id: 'ss-separator',
    parentId: 'sportshield',
    type: 'separator',
    contexts: ['image', 'link', 'page', 'video', 'audio'],
  });

  chrome.contextMenus.create({
    id: 'ss-report-pirate',
    parentId: 'sportshield',
    title: 'Report as pirate stream/content',
    contexts: ['link', 'page', 'video', 'audio'],
  });

  chrome.contextMenus.create({
    id: 'ss-report-page',
    parentId: 'sportshield',
    title: 'Report this page as pirate source',
    contexts: ['page'],
  });

  // Scan page
  chrome.contextMenus.create({
    id: 'ss-scan-page',
    parentId: 'sportshield',
    title: 'Scan page images against my library',
    contexts: ['page'],
  });

  // Badge setup
  chrome.action.setBadgeBackgroundColor({ color: '#1a5c1a' });
  refreshBadge();
});


// ── Context Menu Click Handler ─────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case 'ss-protect-image':
      await protectImage(info.srcUrl, tab);
      break;

    case 'ss-search-image':
      await searchImage(info.srcUrl, tab);
      break;

    case 'ss-verify-c2pa':
      await verifyC2PA(info.srcUrl, tab);
      break;

    case 'ss-check-watermark':
      await checkWatermark(info.srcUrl, tab);
      break;

    case 'ss-report-pirate':
      await reportPirate(info.linkUrl || info.pageUrl, tab);
      break;

    case 'ss-report-page':
      await reportPirate(info.pageUrl, tab);
      break;

    case 'ss-scan-page':
      await scanPage(tab);
      break;
  }
});


// ── Protect Image ──────────────────────────────────────────────────────

async function protectImage(imageUrl, tab) {
  showNotification('Protecting...', 'Uploading image to SportShield');
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const filename = imageUrl.split('/').pop().split('?')[0] || 'image.png';

    const formData = new FormData();
    formData.append('file', blob, filename);

    const result = await fetch(`${API_BASE}/upload?user_id=demo_user`, {
      method: 'POST',
      body: formData,
    });

    if (result.ok) {
      const data = await result.json();
      showNotification('Protected!',
        `${filename} uploaded.\nPDQ hash + CLIP indexed + watermarked + C2PA signed.`
      );
      refreshBadge();
    } else {
      showNotification('Upload failed', 'Could not upload to SportShield');
    }
  } catch (e) {
    showNotification('Error', e.message);
  }
}


// ── CLIP Semantic Search ───────────────────────────────────────────────

async function searchImage(imageUrl, tab) {
  showNotification('Searching...', 'Running CLIP semantic search');
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob, 'search.png');

    const result = await fetch(`${API_BASE}/clip-search?top_k=5`, {
      method: 'POST',
      body: formData,
    });

    if (result.ok) {
      const data = await result.json();
      const count = data.count || 0;
      if (count > 0) {
        showNotification('Matches found!',
          `${count} similar image(s) in your library.\nTop match score: ${(data.matches[0]?.score * 100).toFixed(1)}%`
        );
      } else {
        showNotification('No matches', 'This image is not in your protected library.');
      }
    } else {
      showNotification('Search failed', 'Could not search against library');
    }
  } catch (e) {
    showNotification('Error', e.message);
  }
}


// ── Verify C2PA Credentials ────────────────────────────────────────────

async function verifyC2PA(imageUrl, tab) {
  showNotification('Verifying...', 'Checking C2PA Content Credentials');
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob, 'verify.png');

    const result = await fetch(`${API_BASE}/c2pa-verify`, {
      method: 'POST',
      body: formData,
    });

    if (result.ok) {
      const data = await result.json();
      if (data.has_credentials) {
        showNotification('C2PA Verified!',
          `Content Credentials found.\nValid: ${data.is_valid ? 'Yes' : 'No'}\n${data.summary || ''}`
        );
      } else {
        showNotification('No C2PA', 'This image has no Content Credentials.');
      }
    }
  } catch (e) {
    showNotification('Error', e.message);
  }
}


// ── Check Forensic Watermark ───────────────────────────────────────────

async function checkWatermark(imageUrl, tab) {
  showNotification('Extracting...', 'Checking for forensic watermark');
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append('file', blob, 'check.png');

    const result = await fetch(`${API_BASE}/extract-forensic-watermark`, {
      method: 'POST',
      body: formData,
    });

    if (result.ok) {
      const data = await result.json();
      if (data.found) {
        showNotification('Watermark Found!',
          `Forensic watermark detected!\nLeaker: ${data.leaker_id || 'unknown'}\nSession: ${data.session_id || 'unknown'}`
        );
      } else {
        showNotification('No watermark', 'No forensic watermark detected in this image.');
      }
    }
  } catch (e) {
    showNotification('Error', e.message);
  }
}


// ── Report Pirate Stream ───────────────────────────────────────────────

async function reportPirate(url, tab) {
  try {
    const result = await fetch(`${API_BASE}/crowd/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        suspectUrl: url,
        eventName: '',
        platform: '',
        description: `Reported from browser extension on ${tab.title || 'unknown page'}`,
      }),
    });

    if (result.ok) {
      const data = await result.json();
      showNotification('Reported!',
        `Pirate report submitted.\nID: ${data.submission_id}\nStatus: pending verification`
      );
      refreshBadge();
    } else {
      showNotification('Report failed', 'Could not submit pirate report');
    }
  } catch (e) {
    showNotification('Error', e.message);
  }
}


// ── Scan Page Images ───────────────────────────────────────────────────

async function scanPage(tab) {
  chrome.tabs.sendMessage(tab.id, { action: 'scanPageImages' });
  showNotification('Scanning...', 'Checking all images on this page against your library');
}


// ── Badge / Stats ──────────────────────────────────────────────────────

async function refreshBadge() {
  try {
    const [radarRes, crowdRes] = await Promise.all([
      fetch(`${API_BASE}/radar/stats`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE}/crowd/stats`).then(r => r.json()).catch(() => null),
    ]);

    const detections = radarRes?.pirate_streams_found || 0;
    const pending = crowdRes?.pending_verification || 0;
    const total = detections + pending;

    if (total > 0) {
      chrome.action.setBadgeText({ text: String(total) });
      chrome.action.setBadgeBackgroundColor({ color: '#dc2626' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }

    // Store stats for popup
    chrome.storage.local.set({ radarStats: radarRes, crowdStats: crowdRes });
  } catch (e) {
    // API not reachable
  }
}

// Refresh every 60 seconds
setInterval(refreshBadge, 60000);


// ── Message Handler (from popup/content) ───────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'refreshBadge') {
    refreshBadge();
    sendResponse({ ok: true });
  }
  if (msg.action === 'getStats') {
    chrome.storage.local.get(['radarStats', 'crowdStats'], (data) => {
      sendResponse(data);
    });
    return true; // async response
  }
  if (msg.action === 'scanResult') {
    const { matched, total } = msg;
    showNotification('Page Scan Complete',
      `Scanned ${total} images.\n${matched} match(es) found in your library.`
    );
  }
});


// ── Notification Helper ────────────────────────────────────────────────

function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: `SportShield — ${title}`,
    message: message,
  });
}
