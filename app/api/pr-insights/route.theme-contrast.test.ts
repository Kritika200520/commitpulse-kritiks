import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/services/github/pr-insights', () => ({
  fetchPRInsights: vi.fn(),
}));

import { fetchPRInsights } from '@/services/github/pr-insights';
import type { PRInsightData } from '@/services/github/pr-insights';

const mockInsights: PRInsightData = {
  totalPRs: 20,
  openPRs: 5,
  mergedPRs: 12,
  closedPRs: 3,
  mergeRate: 60,
  avgReviewTime: 5,
  avgTimeToFirstReview: 2,
  avgCycleTime: 24,
  weeklyActivity: [{ name: '2024-W01', prs: 3 }],
  monthlyActivity: [{ name: '2024-01', prs: 8 }],
  reviewsGiven: 7,
  reviewsReceived: 9,
  avgReviewResponseTime: 5,
  fastestReview: 1,
  slowestReview: 48,
  repoPerformance: [
    { name: 'org/repo', totalPRs: 10, mergeRate: 70, reviewCount: 4, avgReviewTime: 6 },
  ],
  highlights: {
    mostDiscussed: { title: 'Big PR', url: 'https://github.com/org/repo/pull/1', comments: 12 },
    fastestMerged: { title: 'Quick fix', url: 'https://github.com/org/repo/pull/2', time: 0.5 },
    largest: {
      title: 'Refactor',
      url: 'https://github.com/org/repo/pull/3',
      additions: 500,
      deletions: 100,
    },
  },
};

function makeRequest(
  params: Record<string, string> = {},
  headers: Record<string, string> = {}
): Request {
  const url = new URL('http://localhost/api/pr-insights');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new Request(url.toString(), {
    headers: new Headers(headers),
  });
}

describe('GET /api/pr-insights theme-contrast: Dark and Light Prefers-Color-Scheme Visual Cohesion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPRInsights).mockResolvedValue(mockInsights);
  });

  it('returns identical data structure regardless of dark or light prefers-color-scheme header', async () => {
    const darkResponse = await GET(
      makeRequest({ username: 'testuser' }, { 'sec-ch-prefers-color-scheme': 'dark' })
    );
    const lightResponse = await GET(
      makeRequest({ username: 'testuser' }, { 'sec-ch-prefers-color-scheme': 'light' })
    );

    const darkBody = await darkResponse.json();
    const lightBody = await lightResponse.json();

    // API is theme-agnostic — payload must be identical for both color schemes
    expect(darkBody).toEqual(lightBody);
    expect(darkResponse.status).toBe(200);
    expect(lightResponse.status).toBe(200);
  });

  it('returns numeric stat fields suitable for color-coded badges in both themes', async () => {
    const response = await GET(makeRequest({ username: 'testuser' }));
    const body = await response.json();

    // mergeRate, totalPRs etc are rendered as colored stat cards in both light/dark UI
    expect(typeof body.mergeRate).toBe('number');
    expect(typeof body.totalPRs).toBe('number');
    expect(typeof body.openPRs).toBe('number');
    expect(typeof body.mergedPRs).toBe('number');
    expect(typeof body.closedPRs).toBe('number');
  });

  it('returns highlight fields with title and url required for accessible link contrast styling', async () => {
    const response = await GET(makeRequest({ username: 'testuser' }));
    const body = await response.json();

    // Highlight cards need title/url text for theme-aware link styling
    expect(body.highlights.mostDiscussed).toHaveProperty('title');
    expect(body.highlights.mostDiscussed).toHaveProperty('url');
    expect(body.highlights.fastestMerged).toHaveProperty('title');
    expect(body.highlights.largest).toHaveProperty('title');
  });

  it('returns consistent error response and Content-Type regardless of theme headers', async () => {
    const darkResponse = await GET(makeRequest({}, { 'sec-ch-prefers-color-scheme': 'dark' }));
    const lightResponse = await GET(makeRequest({}, { 'sec-ch-prefers-color-scheme': 'light' }));

    expect(darkResponse.status).toBe(400);
    expect(lightResponse.status).toBe(400);

    expect(darkResponse.headers.get('content-type')).toMatch(/application\/json/);
    expect(lightResponse.headers.get('content-type')).toMatch(/application\/json/);

    const darkBody = await darkResponse.json();
    const lightBody = await lightResponse.json();
    expect(darkBody.error).toBe(lightBody.error);
  });

  it('returns repoPerformance array with mergeRate values usable for progress bar contrast styling in both themes', async () => {
    const response = await GET(makeRequest({ username: 'testuser' }));
    const body = await response.json();

    expect(Array.isArray(body.repoPerformance)).toBe(true);
    body.repoPerformance.forEach((repo: { mergeRate: number; name: string }) => {
      // mergeRate drives progress bar fill color in both light/dark themes
      expect(typeof repo.mergeRate).toBe('number');
      expect(repo.mergeRate).toBeGreaterThanOrEqual(0);
      expect(repo.mergeRate).toBeLessThanOrEqual(100);
      expect(typeof repo.name).toBe('string');
    });
  });
});
