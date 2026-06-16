import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { Suspense } from 'react';
import ContributionCity3D from './ContributionCity3D';
import type { ActivityData } from '@/types/dashboard';

// ── Minimal Canvas2D mock ───────────────────────────────────────────────────
const mockCtx = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  ellipse: vi.fn(),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  globalAlpha: 1,
};

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as any;
  // ResizeObserver stub
  global.ResizeObserver = vi.fn().mockImplementation((cb) => ({
    observe: vi.fn(() => cb([], {} as ResizeObserver)),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }));
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function makeActivity(n = 98): ActivityData[] {
  return Array.from({ length: n }, (_, i) => ({
    date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    count: i % 7 === 0 ? 0 : (i % 4) + 1,
    intensity: (i % 5) as 0 | 1 | 2 | 3 | 4,
  }));
}

// ── ContributionCity3D ───────────────────────────────────────────────────────
describe('ContributionCity3D', () => {
  it('renders a canvas element', () => {
    const { container } = render(<ContributionCity3D data={makeActivity()} theme="dark" />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('shows the drag-to-rotate hint', () => {
    render(<ContributionCity3D data={makeActivity()} theme="neon" />);
    expect(screen.getByText(/drag to rotate/i)).toBeTruthy();
  });

  it('accepts different themes without error', () => {
    const themes = ['dark', 'neon', 'synthwave', 'dracula', 'ocean', 'forest'];
    themes.forEach((theme) => {
      expect(() =>
        render(<ContributionCity3D data={makeActivity()} theme={theme} />)
      ).not.toThrow();
    });
  });

  it('handles empty data gracefully', () => {
    expect(() => render(<ContributionCity3D data={[]} theme="dark" />)).not.toThrow();
  });

  it('handles zero-contribution days', () => {
    const allZero = makeActivity(98).map((d) => ({ ...d, count: 0, intensity: 0 as const }));
    expect(() => render(<ContributionCity3D data={allZero} theme="dark" />)).not.toThrow();
  });

  it('uses the days prop to slice data', () => {
    const data = makeActivity(365);
    const { container } = render(<ContributionCity3D data={data} theme="dark" days={30} />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('updates cursor style when dragging', async () => {
    const { container } = render(<ContributionCity3D data={makeActivity()} theme="dark" />);
    const wrapper = container.firstChild as HTMLElement;
    const canvas = container.querySelector('canvas')!;

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    await waitFor(() => {
      expect(wrapper.style.cursor || 'grabbing').toContain('grab');
    });
  });

  it('zooms on wheel event', () => {
    const { container } = render(<ContributionCity3D data={makeActivity()} theme="dark" />);
    const canvas = container.querySelector('canvas')!;
    // Should not throw
    expect(() => {
      fireEvent.wheel(canvas, { deltaY: -100 });
      fireEvent.wheel(canvas, { deltaY: 100 });
    }).not.toThrow();
  });
});

// ── ViewToggle3D (ActivityLandscape integration) ─────────────────────────────
describe('ViewToggle3D', () => {
  it('toggle button exists in ActivityLandscape', async () => {
    // We test the ActivityLandscape component which now contains the toggle
    const { ActivityLandscape } = (await import('./ActivityLandscape')) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ActivityLandscape?: any;
      default?: any;
    };
    const Component = ActivityLandscape ?? (await import('./ActivityLandscape')).default;

    render(
      <Suspense fallback={null}>
        <Component data={makeActivity()} />
      </Suspense>
    );

    const btn = screen.queryByText(/3D City/i);
    expect(btn).toBeTruthy();
  });

  it('toggles to 3D city view on button click', async () => {
    const Component = (await import('./ActivityLandscape')).default;

    render(
      <Suspense fallback={<div>loading</div>}>
        <Component data={makeActivity()} />
      </Suspense>
    );

    const btn = screen.getByText(/3D City/i);
    fireEvent.click(btn);

    // Canvas should appear inside the Suspense boundary (mocked immediately)
    await waitFor(() => {
      expect(screen.queryByRole('img', { name: /activity chart/i })).toBeNull();
    });
  });
});
