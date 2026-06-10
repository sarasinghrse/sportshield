// SportShield Extension — Content Script
// Runs on every page. Handles:
//   1. Passive image scanning against protected library
//   2. Visual badges on matched/protected images
//   3. C2PA credential indicators

const API_BASE = 'http://localhost:8000/api/media';

// ── Page Scan (triggered from background or auto) ──────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'scanPageImages') {
    scanAllImages();
  }
});

async function scanAllImages() {
  const images = document.querySelectorAll('img');
  const validImages = Array.from(images).filter(img => {
    const src = img.src || '';
    return src.startsWith('http') && img.naturalWidth > 80 && img.naturalHeight > 80;
  });

  let matched = 0;
  let scanned = 0;

  for (const img of validImages.slice(0, 20)) {
    try {
      const response = await fetch(img.src);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) continue;

      const formData = new FormData();
      formData.append('file', blob, 'scan.png');

      const result = await fetch(`${API_BASE}/clip-search?top_k=1`, {
        method: 'POST',
        body: formData,
      });

      if (result.ok) {
        const data = await result.json();
        scanned++;
        if (data.count > 0 && data.matches[0]?.score > 0.85) {
          matched++;
          addBadge(img, 'match', `Match: ${(data.matches[0].score * 100).toFixed(0)}%`);
        }
      }
    } catch (e) {
      // Skip failed images
    }
  }

  chrome.runtime.sendMessage({
    action: 'scanResult',
    matched,
    total: scanned,
  });
}


// ── Visual Badge Overlay ───────────────────────────────────────────────

function addBadge(img, type, text) {
  if (img.dataset.ssBadged) return;
  img.dataset.ssBadged = 'true';

  const wrapper = document.createElement('div');
  wrapper.className = 'ss-badge-wrapper';

  const badge = document.createElement('div');
  badge.className = `ss-badge ss-badge-${type}`;
  badge.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
    <span>${text}</span>
  `;

  img.parentNode.insertBefore(wrapper, img);
  wrapper.appendChild(img);
  wrapper.appendChild(badge);
}


// ── Auto-scan on page load (lightweight — only checks large hero images) ──

function autoScanHeroImages() {
  const heroes = document.querySelectorAll('img');
  const large = Array.from(heroes).filter(img => {
    return img.naturalWidth > 400 && img.naturalHeight > 300 && img.src.startsWith('http');
  });

  // Only auto-scan up to 3 large images to avoid noise
  large.slice(0, 3).forEach(async (img) => {
    try {
      const response = await fetch(img.src);
      if (!response.ok) return;
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) return;

      const formData = new FormData();
      formData.append('file', blob, 'auto.png');

      const result = await fetch(`${API_BASE}/clip-search?top_k=1`, {
        method: 'POST',
        body: formData,
      });

      if (result.ok) {
        const data = await result.json();
        if (data.count > 0 && data.matches[0]?.score > 0.90) {
          addBadge(img, 'protected', 'SportShield Protected');
        }
      }
    } catch (e) {
      // Silent fail
    }
  });
}

// Run after page settles
setTimeout(autoScanHeroImages, 3000);
