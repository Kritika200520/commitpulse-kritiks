import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import backgroundRefresh from './background-refresh';
import { getFullDashboardData } from '../../lib/github';

// Mock the GitHub API dependency
vi.mock('../../lib/github', () => ({
  getFullDashboardData: vi.fn(),
}));

describe('BackgroundRefresh Service', () => {
  beforeEach(() => {
    // Reset singleton state and mocks before each test
    backgroundRefresh.reset();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('triggers a background refresh task correctly for a stale user', async () => {
    const mockedApi = vi.mocked(getFullDashboardData);
    // @ts-expect-error Mock return value matches expected structure loosely
    mockedApi.mockResolvedValueOnce({});

    backgroundRefresh.triggerRefresh('octocat');

    // Job should be immediately marked as active
    expect(backgroundRefresh.isJobActive('octocat')).toBe(true);
    expect(mockedApi).toHaveBeenCalledWith('octocat', { bypassCache: true });
    expect(mockedApi).toHaveBeenCalledTimes(1);

    // Wait for the microtask queue to process the Promise resolution
    await vi.runAllTimersAsync();

    // Job should be cleared after successful completion
    expect(backgroundRefresh.isJobActive('octocat')).toBe(false);
  });

  it('correctly calculates stale cache scheduling intervals based on threshold', () => {
    // Threshold is 10 minutes (600,000 ms)
    const now = Date.now();

    // A missing timestamp should immediately be considered stale
    expect(backgroundRefresh.isStale(undefined)).toBe(true);

    // A timestamp from 11 minutes ago should be stale
    const elevenMinsAgo = new Date(now - 11 * 60 * 1000).toISOString();
    expect(backgroundRefresh.isStale(elevenMinsAgo)).toBe(true);

    // A timestamp from 5 minutes ago should NOT be stale yet
    const fiveMinsAgo = new Date(now - 5 * 60 * 1000).toISOString();
    expect(backgroundRefresh.isStale(fiveMinsAgo)).toBe(false);
  });

  it('prevents duplicate concurrent refresh tasks for the same user', () => {
    const mockedApi = vi.mocked(getFullDashboardData);
    // Keep the promise pending so the job stays active
    mockedApi.mockReturnValue(new Promise(() => {}));

    backgroundRefresh.triggerRefresh('octocat');
    backgroundRefresh.triggerRefresh('octocat');
    backgroundRefresh.triggerRefresh('OCTOCAT'); // tests case insensitivity

    // Should only call the API once despite multiple triggers
    expect(mockedApi).toHaveBeenCalledTimes(1);
    expect(backgroundRefresh.isJobActive('octocat')).toBe(true);
  });

  it('handles expired tokens or authentication errors gracefully', async () => {
    const mockedApi = vi.mocked(getFullDashboardData);
    const authError = new Error('Bad credentials');
    Object.assign(authError, { status: 401 });

    // Simulate an API rejection due to an expired token
    mockedApi.mockRejectedValueOnce(authError);

    // Trigger the refresh which will catch the error internally
    backgroundRefresh.triggerRefresh('invalid_token_user');

    // Wait for the async catch block to execute
    await vi.runAllTimersAsync();

    // The error should be caught and the job cleared without crashing the service
    expect(backgroundRefresh.isJobActive('invalid_token_user')).toBe(false);
  });

  it('recovers correctly from network dropouts during synchronization', async () => {
    const mockedApi = vi.mocked(getFullDashboardData);

    // Simulate a network timeout error
    mockedApi.mockRejectedValueOnce(new Error('Network timeout'));

    backgroundRefresh.triggerRefresh('offline_user');

    expect(backgroundRefresh.isJobActive('offline_user')).toBe(true);

    await vi.runAllTimersAsync();

    // Even if the network drops, the finally() block must execute and clear the active job
    // so that subsequent syncs can be attempted later.
    expect(backgroundRefresh.isJobActive('offline_user')).toBe(false);
  });
});
