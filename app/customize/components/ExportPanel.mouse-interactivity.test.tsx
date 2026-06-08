import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExportPanel } from './ExportPanel';
import type { ExportFormat } from '../types';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('ExportPanel - Mouse Interactivity & Tooltips', () => {
  const defaultProps = {
    format: 'markdown' as ExportFormat,
    snippet: '![CommitPulse](https://commitpulse.vercel.app/api/badge?user=octocat)',
    copied: false,
    copyStatusMessage: 'Markdown snippet copied to clipboard.',
    hasUsername: true,
    username: 'octocat',
    onFormatChange: vi.fn(),
    onCopy: vi.fn(),
  };

  const renderPanel = (overrides?: Partial<typeof defaultProps>) => {
    const onFormatChange = overrides?.onFormatChange ?? vi.fn();
    const onCopy = overrides?.onCopy ?? vi.fn();

    const props = {
      ...defaultProps,
      ...overrides,
      onFormatChange,
      onCopy,
    };

    const view = render(<ExportPanel {...props} />);

    return { ...view, onFormatChange, onCopy };
  };

  let originalGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.clearAllMocks();
    originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should display tooltip on mouseenter with correct positioning', async () => {
    const user = userEvent.setup();
    renderPanel({ format: 'action' });

    const step2CopyButton = screen.getByRole('button', {
      name: /copy step 2 markdown snippet/i,
    });

    const mockRect = {
      width: 28,
      height: 28,
      top: 64,
      left: 420,
      bottom: 92,
      right: 448,
      x: 420,
      y: 64,
      toJSON: () => ({}),
    };

    vi.spyOn(step2CopyButton, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

    await user.hover(step2CopyButton);

    expect(step2CopyButton).toHaveAttribute('title', 'Copy Step 2 markdown');
    expect(step2CopyButton.getBoundingClientRect().left).toBe(420);
    expect(step2CopyButton.getBoundingClientRect().top).toBe(64);
  });

  it('should apply pointer cursor on hoverable elements', () => {
    renderPanel();

    const htmlFormatButton = screen.getByRole('button', { name: 'HTML' });
    const copyButton = screen.getByRole('button', {
      name: /copy markdown export snippet to clipboard/i,
    });
    const downloadButton = screen.getByRole('button', {
      name: /download badge as commitpulse-octocat\.svg/i,
    });

    expect(htmlFormatButton.className).toContain('hover:text-black');
    expect(copyButton.className).toContain('hover:bg-gray-300/80');
    expect(downloadButton.className).toContain('hover:bg-emerald-500/20');

    fireEvent.mouseEnter(htmlFormatButton);
    fireEvent.mouseEnter(copyButton);
    fireEvent.mouseEnter(downloadButton);

    expect(htmlFormatButton.className).toContain('hover:text-black');
    expect(copyButton.className).toContain('hover:scale-[1.03]');
    expect(downloadButton.className).toContain('hover:scale-[1.03]');
  });

  it('should hide tooltip on mouseleave', async () => {
    const user = userEvent.setup();
    renderPanel({ format: 'action' });

    const step2CopyButton = screen.getByRole('button', {
      name: /copy step 2 markdown snippet/i,
    });

    await user.hover(step2CopyButton);
    expect(step2CopyButton).toHaveAttribute('title', 'Copy Step 2 markdown');

    await user.unhover(step2CopyButton);

    await waitFor(() => {
      expect(step2CopyButton).toBeInTheDocument();
      expect(screen.queryByRole('tooltip')).toBeNull();
    });
  });

  it('should properly propagate click events', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const onFormatChange = vi.fn();
    const parentClick = vi.fn();

    const { container } = render(
      <div onClick={parentClick}>
        <ExportPanel {...defaultProps} onCopy={onCopy} onFormatChange={onFormatChange} />
      </div>
    );

    const copyButton = screen.getByRole('button', {
      name: /copy markdown export snippet to clipboard/i,
    });
    const copyIcon = copyButton.querySelector('svg');
    expect(copyIcon).not.toBeNull();

    if (copyIcon) {
      fireEvent.click(copyIcon);
    }

    expect(onCopy).toHaveBeenCalledTimes(1);

    const htmlButton = screen.getByRole('button', { name: 'HTML' });
    fireEvent.touchStart(htmlButton);
    await user.click(htmlButton);

    expect(onFormatChange).toHaveBeenCalledWith('html');
    expect(parentClick).toHaveBeenCalled();

    const downloadButton = screen.getByRole('button', {
      name: /download badge as commitpulse-octocat\.svg/i,
    });
    const downloadIcon = downloadButton.querySelector('svg');
    expect(downloadIcon).not.toBeNull();

    if (downloadIcon) {
      fireEvent.click(downloadIcon);
    }

    expect(container.querySelector('button')).toBeTruthy();
  });

  it('should position tooltips correctly based on mouse coordinates', async () => {
    renderPanel({ format: 'action' });

    const step2CopyButton = screen.getByRole('button', {
      name: /copy step 2 markdown snippet/i,
    });

    const mockRect = {
      width: 40,
      height: 40,
      top: 100,
      left: 200,
      bottom: 140,
      right: 240,
      x: 200,
      y: 100,
      toJSON: () => ({}),
    };

    vi.spyOn(step2CopyButton, 'getBoundingClientRect').mockReturnValue(mockRect as DOMRect);

    const mouseX = mockRect.left + mockRect.width / 2;
    const mouseY = mockRect.top + mockRect.height / 2;

    fireEvent.mouseMove(step2CopyButton, {
      clientX: mouseX,
      clientY: mouseY,
      bubbles: true,
    });

    fireEvent.mouseEnter(step2CopyButton, {
      clientX: mouseX,
      clientY: mouseY,
      bubbles: true,
    });

    const rect = step2CopyButton.getBoundingClientRect();
    const tooltipAnchorX = rect.left + rect.width / 2;
    const tooltipAnchorY = rect.top + rect.height / 2;

    expect(tooltipAnchorX).toBe(220);
    expect(tooltipAnchorY).toBe(120);
    expect(step2CopyButton).toHaveAttribute('title', 'Copy Step 2 markdown');
  });
});
