const now = new Date();
const day = 86400000;

const ts = (daysAgo) => {
  const d = new Date(now.getTime() - daysAgo * day);
  return { toDate: () => d, seconds: Math.floor(d.getTime() / 1000) };
};

export const DEMO_ASSETS = [
  {
    id: 'demo-asset-1',
    filename: 'virat-kohli-century.jpg',
    type: 'image',
    status: 'complete',
    originalUrl: '/images/sportshield-logo-transparent.png',
    matchCount: 4,
    unauthorizedCount: 3,
    authorizedCount: 1,
    scanCount: 12,
    riskScore: 78,
    riskLabel: 'high',
    uploadedAt: ts(14),
    aiDetection: { is_ai: false, confidence: 0.05 },
    deepfakeAnalysis: null,
  },
  {
    id: 'demo-asset-2',
    filename: 'ipl-final-celebration.mp4',
    type: 'video',
    status: 'complete',
    originalUrl: null,
    matchCount: 2,
    unauthorizedCount: 2,
    authorizedCount: 0,
    scanCount: 8,
    riskScore: 65,
    riskLabel: 'high',
    uploadedAt: ts(7),
    aiDetection: { is_ai: false, confidence: 0.02 },
    deepfakeAnalysis: null,
  },
  {
    id: 'demo-asset-3',
    filename: 'olympic-sprint-finish.jpg',
    type: 'image',
    status: 'complete',
    originalUrl: '/images/sportshield-logo-transparent.png',
    matchCount: 1,
    unauthorizedCount: 0,
    authorizedCount: 1,
    scanCount: 5,
    riskScore: 12,
    riskLabel: 'low',
    uploadedAt: ts(21),
    aiDetection: { is_ai: false, confidence: 0.01 },
    deepfakeAnalysis: null,
  },
  {
    id: 'demo-asset-4',
    filename: 'football-world-cup-goal.jpg',
    type: 'image',
    status: 'scanning',
    originalUrl: '/images/sportshield-logo-transparent.png',
    matchCount: 0,
    unauthorizedCount: 0,
    authorizedCount: 0,
    scanCount: 1,
    riskScore: 0,
    riskLabel: 'low',
    uploadedAt: ts(1),
    aiDetection: null,
    deepfakeAnalysis: null,
  },
  {
    id: 'demo-asset-5',
    filename: 'tennis-match-highlight.jpg',
    type: 'image',
    status: 'complete',
    originalUrl: '/images/sportshield-logo-transparent.png',
    matchCount: 6,
    unauthorizedCount: 5,
    authorizedCount: 1,
    scanCount: 15,
    riskScore: 91,
    riskLabel: 'critical',
    uploadedAt: ts(30),
    aiDetection: { is_ai: true, confidence: 0.82 },
    deepfakeAnalysis: { isDeepfake: true, confidence: 0.76 },
  },
];

export const DEMO_ALERTS = [
  {
    id: 'demo-alert-1',
    assetId: 'demo-asset-5',
    userId: 'demo_user',
    confidence: 0.91,
    foundUrl: 'https://pirate-streams.example.com/stolen-tennis-photo',
    thumbnailUrl: null,
    severity: 'high',
    riskScore: 91,
    riskLabel: 'critical',
    classification: 'unauthorized',
    isRead: false,
    createdAt: ts(0.5),
    smartSummary: 'High-risk unauthorized use detected on pirate-streams.example.com. The domain is not in your trusted list, match confidence is 91%, no active license exists, and this asset has verified ownership proof on file. Immediate action recommended.',
  },
  {
    id: 'demo-alert-2',
    assetId: 'demo-asset-1',
    confidence: 0.74,
    foundUrl: 'https://sports-blog.example.net/kohli-century-gallery',
    thumbnailUrl: null,
    severity: 'medium',
    riskScore: 52,
    riskLabel: 'high',
    classification: 'unauthorized',
    isRead: false,
    createdAt: ts(1),
    smartSummary: 'Medium-risk unauthorized use found on sports-blog.example.net. Match confidence is 74% and the domain is unfamiliar. No licensing agreement is on record. Consider sending a DMCA notice or adding the domain to your trusted list if this use is authorized.',
  },
  {
    id: 'demo-alert-3',
    assetId: 'demo-asset-2',
    confidence: 0.88,
    foundUrl: 'https://restream-hub.example.org/ipl-final-replay',
    thumbnailUrl: null,
    severity: 'high',
    riskScore: 85,
    riskLabel: 'critical',
    classification: 'unauthorized',
    isRead: false,
    createdAt: ts(2),
    smartSummary: 'Critical unauthorized redistribution of your IPL final video on restream-hub.example.org. Confidence is 88%, risk score is 85. The platform is known for pirated sports content. A DMCA takedown notice has been pre-generated and is ready to send.',
  },
  {
    id: 'demo-alert-4',
    assetId: 'demo-asset-1',
    confidence: 0.65,
    foundUrl: 'https://fan-forum.example.com/match-photos',
    thumbnailUrl: null,
    severity: 'medium',
    riskScore: 38,
    riskLabel: 'medium',
    classification: 'unauthorized',
    isRead: true,
    createdAt: ts(5),
    smartSummary: 'Moderate-risk use on fan-forum.example.com. Match confidence is 65%. This appears to be a fan forum sharing match photos. Consider whether this falls under fair use before taking action.',
  },
];

export const DEMO_PROFILE = {
  accountType: 'individual',
  orgName: 'Demo Athlete',
  trustedDomains: ['espn.com', 'sportshield.app', 'olympics.com'],
  onboardingComplete: true,
};

export const DEMO_WATCHED_URLS = [
  {
    url: 'https://pirate-streams.example.com/live-sports',
    label: 'Known pirate streaming site',
    addedAt: ts(10),
    lastCheckedAt: ts(0.25),
    status: 'active',
    lastResult: { accessible: true, statusCode: 200, changed: false, checkedAt: ts(0.25) },
  },
  {
    url: 'https://sports-blog.example.net/gallery',
    label: 'Blog using my photos',
    addedAt: ts(5),
    lastCheckedAt: ts(0.25),
    status: 'active',
    lastResult: { accessible: true, statusCode: 200, changed: true, checkedAt: ts(0.25) },
  },
  {
    url: 'https://old-pirate-site.example.org',
    label: 'Taken down last month',
    addedAt: ts(30),
    lastCheckedAt: ts(0.25),
    status: 'paused',
    lastResult: { accessible: false, statusCode: 404, changed: false, checkedAt: ts(0.25) },
  },
];

export const DEMO_REPORT = {
  id: 'demo-report-1',
  userId: 'demo_user',
  generatedAt: ts(0),
  periodStart: ts(7),
  periodEnd: ts(0),
  stats: {
    newMatches: 7,
    alertsTriggered: 4,
    dmcaActionsTaken: 2,
    assetsScanned: 5,
    protectionScoreCurrent: 72,
    protectionScorePrevious: 65,
  },
  topAlerts: [
    { assetName: 'tennis-match-highlight.jpg', foundUrl: 'pirate-streams.example.com', confidence: 0.91, severity: 'high' },
    { assetName: 'ipl-final-celebration.mp4', foundUrl: 'restream-hub.example.org', confidence: 0.88, severity: 'high' },
    { assetName: 'virat-kohli-century.jpg', foundUrl: 'sports-blog.example.net', confidence: 0.74, severity: 'medium' },
  ],
  narrative: `This week, SportShield detected 7 new matches across your 5 protected assets, triggering 4 alerts. Two of these were critical — a pirated tennis photo on pirate-streams.example.com (91% confidence) and an unauthorized IPL video restream on restream-hub.example.org (88% confidence). DMCA takedown notices were sent for both.\n\nYour protection score improved from 65 to 72 this week, thanks to two successful takedowns being acknowledged. The tennis highlight asset remains your highest-risk item with 5 unauthorized copies still active across the web.\n\nRecommendation: Consider adding forensic watermarks to your most-shared assets to strengthen future enforcement cases. The IPL video would benefit from audio fingerprint monitoring via the Live Radar feature.`,
  emailSent: true,
  emailSentAt: ts(0),
};

/* ── War Room / Live Radar demo data ── */

export const DEMO_RADAR_STATS = {
  active_events: 3,
  total_suspects_analyzed: 47,
  pirate_streams_found: 12,
  total_detections: 18,
};

export const DEMO_RADAR_EVENTS = [
  {
    event_id: 'evt_demo_001',
    event_name: 'India vs Australia — T20 World Cup Semi-Final',
    teams: ['India', 'Australia'],
    broadcaster: 'Star Sports',
    league: 'ICC T20 World Cup 2026',
    status: 'monitoring',
    suspect_count: 14,
    detection_count: 6,
    created_at: ts(0),
  },
  {
    event_id: 'evt_demo_002',
    event_name: 'Arsenal vs Chelsea — Premier League GW34',
    teams: ['Arsenal', 'Chelsea'],
    broadcaster: 'Sky Sports',
    league: 'Premier League',
    status: 'monitoring',
    suspect_count: 9,
    detection_count: 3,
    created_at: ts(1),
  },
  {
    event_id: 'evt_demo_003',
    event_name: 'Real Madrid vs Barcelona — La Liga Clásico',
    teams: ['Real Madrid', 'Barcelona'],
    broadcaster: 'DAZN',
    league: 'La Liga',
    status: 'completed',
    suspect_count: 24,
    detection_count: 9,
    created_at: ts(3),
  },
];

export const DEMO_DETECTIONS = [
  { detection_id: 'det_001', event_name: 'India vs Australia — T20 World Cup Semi-Final', source_url: 'https://pirate-stream.live/cricket-free', composite_score: 0.94, confidence: 'HIGH', detected_at: ts(0) },
  { detection_id: 'det_002', event_name: 'India vs Australia — T20 World Cup Semi-Final', source_url: 'https://free-sports.tv/ind-v-aus', composite_score: 0.87, confidence: 'HIGH', detected_at: ts(0) },
  { detection_id: 'det_003', event_name: 'Arsenal vs Chelsea — Premier League GW34', source_url: 'https://soccer-streams.net/epl-live', composite_score: 0.91, confidence: 'HIGH', detected_at: ts(1) },
  { detection_id: 'det_004', event_name: 'Real Madrid vs Barcelona — La Liga Clásico', source_url: 'https://futbol-gratis.io/clasico', composite_score: 0.78, confidence: 'MEDIUM', detected_at: ts(2) },
  { detection_id: 'det_005', event_name: 'India vs Australia — T20 World Cup Semi-Final', source_url: 'https://stream247.cc/live-cricket', composite_score: 0.82, confidence: 'HIGH', detected_at: ts(0) },
];

export const DEMO_ENFORCEMENT_STATS = {
  total_cases: 12,
  active_cases: 5,
  resolved_cases: 7,
  under_30_min_rate: 72,
};

export const DEMO_CASES = [
  { case_id: 'case_001', event_name: 'India vs Australia — T20 WC', platform: 'pirate-stream.live', source_url: 'https://pirate-stream.live/cricket-free', status: 'dmca_filed', escalation_level: 0 },
  { case_id: 'case_002', event_name: 'Arsenal vs Chelsea — PL', platform: 'soccer-streams.net', source_url: 'https://soccer-streams.net/epl-live', status: 'dmca_generated', escalation_level: 0 },
  { case_id: 'case_003', event_name: 'Real Madrid vs Barcelona', platform: 'futbol-gratis.io', source_url: 'https://futbol-gratis.io/clasico', status: 'escalated_isp', escalation_level: 2 },
  { case_id: 'case_004', event_name: 'India vs Australia — T20 WC', platform: 'free-sports.tv', source_url: 'https://free-sports.tv/ind-v-aus', status: 'resolved_content_removed', escalation_level: 0 },
  { case_id: 'case_005', event_name: 'India vs Australia — T20 WC', platform: 'stream247.cc', source_url: 'https://stream247.cc/live-cricket', status: 'dmca_filed', escalation_level: 1 },
];

export const DEMO_CROWD_STATS = {
  total_contributors: 156,
  total_submissions: 342,
  verified_pirates: 89,
  verification_rate: 26,
};

export const DEMO_LEADERBOARD = [
  { user_id: 'u1', display_name: 'PiracyHunter_IN', rank: 'legend', total_points: 4820, verified_finds: 47 },
  { user_id: 'u2', display_name: 'StreamWatch_UK', rank: 'expert', total_points: 3150, verified_finds: 31 },
  { user_id: 'u3', display_name: 'SportGuard', rank: 'expert', total_points: 2740, verified_finds: 26 },
  { user_id: 'u4', display_name: 'CricketShield', rank: 'veteran', total_points: 1890, verified_finds: 18 },
  { user_id: 'u5', display_name: 'FootballPatrol', rank: 'veteran', total_points: 1420, verified_finds: 14 },
  { user_id: 'u6', display_name: 'AntiPirate_SA', rank: 'hunter', total_points: 960, verified_finds: 9 },
  { user_id: 'u7', display_name: 'StreamDetective', rank: 'hunter', total_points: 710, verified_finds: 7 },
  { user_id: 'u8', display_name: 'MediaWatch', rank: 'scout', total_points: 340, verified_finds: 3 },
];
