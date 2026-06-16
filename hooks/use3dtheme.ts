'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Returns the canonical theme key to feed into ContributionCity3D / ViewToggle3D.
 *
 * Resolution order:
 *  1. `forcedTheme` argument (explicit override, e.g. from a URL param or user pref)
 *  2. The `data-theme` attribute on <html>  (set by next-themes or the app's ThemeSwitch)
 *  3. OS-level prefers-color-scheme  → "dark" | "light"
 *  4. Hard fallback → "dark"
 *
 * The returned string matches the keys in lib/svg/themes.ts and the
 * THEME_PALETTES map inside ContributionCity3D.
 */

function readThemeFromDOM(): string {
  if (typeof window === 'undefined') return 'dark';
  const htmlTheme = document.documentElement.getAttribute('data-theme');
  if (htmlTheme) return htmlTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function use3DTheme(forcedTheme?: string): string {
  // Lazy-initialise from DOM so the very first render is already correct —
  // this avoids a setState call inside a useEffect body (react-hooks/no-state-in-effect).
  const [domTheme, setDomTheme] = useState<string>(() => readThemeFromDOM());

  // Track previous forcedTheme so we can skip redundant re-renders
  const prevForcedRef = useRef(forcedTheme);

  useEffect(() => {
    // If a forced theme is provided, we don't need DOM listeners.
    if (forcedTheme !== undefined) {
      prevForcedRef.current = forcedTheme;
      return;
    }

    // Keep domTheme in sync when the user switches theme at runtime.
    const handleChange = () => setDomTheme(readThemeFromDOM());

    const observer = new MutationObserver(handleChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', handleChange);

    return () => {
      observer.disconnect();
      mq.removeEventListener('change', handleChange);
    };
  }, [forcedTheme]);

  // Derive the final theme synchronously — no setState involved.
  return useMemo(
    () => (forcedTheme !== undefined ? forcedTheme : domTheme),
    [forcedTheme, domTheme]
  );
}
