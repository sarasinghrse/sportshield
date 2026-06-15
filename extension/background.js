const SITE_URL = 'https://sportshield--sportshield-app.us-central1.hosted.app';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'sportshield',
    title: 'SportShield',
    contexts: ['page', 'link', 'image', 'video', 'audio'],
  });

  chrome.contextMenus.create({
    id: 'ss-flag-pirate',
    parentId: 'sportshield',
    title: 'Flag this site as pirate source',
    contexts: ['page', 'link', 'image', 'video', 'audio'],
  });

  chrome.contextMenus.create({
    id: 'ss-open-warroom',
    parentId: 'sportshield',
    title: 'Open War Room',
    contexts: ['page'],
  });

  chrome.contextMenus.create({
    id: 'ss-open-dashboard',
    parentId: 'sportshield',
    title: 'Open Dashboard',
    contexts: ['page'],
  });

  chrome.action.setBadgeBackgroundColor({ color: '#1a5c1a' });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'ss-flag-pirate') {
    const url = info.linkUrl || info.pageUrl || (tab && tab.url);
    if (!url) return;

    const flagData = {
      url,
      title: tab ? tab.title : '',
      flaggedAt: new Date().toISOString(),
    };

    chrome.storage.local.get({ flaggedSites: [] }, (data) => {
      const sites = data.flaggedSites;
      if (!sites.some((s) => s.url === flagData.url)) {
        sites.push(flagData);
        chrome.storage.local.set({ flaggedSites: sites });
      }
    });

    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'SportShield — Flagged!',
      message: `Reported as pirate source:\n${url}`,
    });
  }

  if (info.menuItemId === 'ss-open-warroom') {
    chrome.tabs.create({ url: `${SITE_URL}/radar` });
  }

  if (info.menuItemId === 'ss-open-dashboard') {
    chrome.tabs.create({ url: SITE_URL });
  }
});
