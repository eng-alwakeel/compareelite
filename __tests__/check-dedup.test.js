/**
 * Tests for the root-keyword dedup gate (scripts/check-dedup.js).
 * Covers the COM-636 regression: a hyphenation variant of a live head term
 * must be caught even though an exact-string check would miss it.
 */

const { normalizeRoot, checkCandidate } = require('../scripts/check-dedup');

describe('normalizeRoot', () => {
  test('collapses hyphenation variants to the same root', () => {
    expect(normalizeRoot('best-weight-lifting-belts-2026').root).toBe(
      normalizeRoot('best-weightlifting-belts-2026').root
    );
    expect(normalizeRoot('best-smart-watches-2026').root).toBe(
      normalizeRoot('best-smartwatches-2026').root
    );
    expect(normalizeRoot('best-sound-bars-2026').root).toBe(
      normalizeRoot('best-soundbars-2026').root
    );
    expect(normalizeRoot('best-wi-fi-routers-2026').root).toBe(
      normalizeRoot('best-wifi-routers-2026').root
    );
  });

  test('strips best-/top- lead-in and 4-digit year', () => {
    const n = normalizeRoot('best-weight-lifting-belts-2026');
    expect(n.root).toBe('weightliftingbelts');
    expect(n.year).toBe('2026');
  });

  test('tolerates .json and articles/ prefixes', () => {
    expect(normalizeRoot('articles/best-ab-rollers-2026.json').root).toBe('abrollers');
  });

  test('distinct topics stay distinct', () => {
    expect(normalizeRoot('best-office-chairs-2026').root).not.toBe(
      normalizeRoot('best-gaming-chairs-2026').root
    );
  });
});

describe('checkCandidate', () => {
  const live = [
    'best-weight-lifting-belts-2026',
    'best-ab-rollers-2026',
    'best-standing-desks-2025',
  ];

  test('COM-636 regression: hyphenation variant is a hard collision', () => {
    const r = checkCandidate('best-weightlifting-belts-2026', live);
    expect(r.verdict).toBe('collision');
    expect(r.match).toBe('best-weight-lifting-belts-2026');
  });

  test('exact live slug is a hard collision', () => {
    expect(checkCandidate('best-ab-rollers-2026', live).verdict).toBe('collision');
  });

  test('same root different year is a soft warning', () => {
    const r = checkCandidate('best-standing-desks-2026', live);
    expect(r.verdict).toBe('warning');
    expect(r.match).toBe('best-standing-desks-2025');
  });

  test('novel topic passes clean', () => {
    expect(checkCandidate('best-mechanical-keyboards-2026', live).verdict).toBe('ok');
  });
});
