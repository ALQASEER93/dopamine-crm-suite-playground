import { describe, expect, it, vi } from 'vitest';
import { hasVisitLocation, lifecycleStateForVisit, visitSyncState } from './VisitsPage';

describe('VisitsPage field-force lifecycle truth', () => {
  it('accepts legitimate zero coordinates and rejects missing or invalid coordinates', () => {
    expect(hasVisitLocation({ lat: 0, lng: 0 })).toBe(true);
    expect(hasVisitLocation({ lat: '', lng: '' })).toBe(false);
    expect(hasVisitLocation({ lat: null, lng: 35.9 })).toBe(false);
    expect(hasVisitLocation({ lat: 'invalid', lng: 35.9 })).toBe(false);
  });

  it('does not invent timestamps, GPS, calls, submission, or sync', () => {
    expect(lifecycleStateForVisit({ status: 'scheduled', notes: 'Notes prove nothing' })).toEqual({
      planned: true,
      started: false,
      checked_in: false,
      in_visit: false,
      call_recorded: false,
      ended: false,
      submitted: false,
      synced: false,
      syncState: 'unavailable',
      locked: false,
    });
    expect(visitSyncState({ syncError: 'test failure' })).toBe('failed');
    expect(visitSyncState({ offlinePending: true })).toBe('pending');
  });

  it('derives completed lifecycle only from explicit persisted fields', () => {
    expect(
      lifecycleStateForVisit({
        visit_date: '2026-07-19',
        status: 'completed',
        started_at: '2026-07-19T08:00:00Z',
        checked_in_at: '2026-07-19T08:01:00Z',
        call_recorded_at: '2026-07-19T08:10:00Z',
        ended_at: '2026-07-19T08:20:00Z',
        serverPersisted: true,
      }),
    ).toMatchObject({
      planned: true,
      started: true,
      checked_in: true,
      in_visit: false,
      call_recorded: true,
      ended: true,
      submitted: true,
      synced: true,
      syncState: 'synced',
      locked: true,
    });
  });

  it('keeps the route Arabic-first, RTL, dark-token, responsive, and free of financial UI', async () => {
    const fs = await vi.importActual('node:fs');
    const source = fs.readFileSync(`${process.cwd()}/src/pages/VisitsPage.jsx`, 'utf8');
    const css = fs.readFileSync(`${process.cwd()}/src/pages/EntityListPage.css`, 'utf8');

    expect(source).toContain('dir="rtl"');
    expect(source).toContain('data-theme-surface="dark-tokens"');
    expect(source).toContain('الزيارات');
    expect(source).toContain('GPS البداية');
    expect(source).toContain('فشل التزامن');
    expect(source).toContain("user?.role?.slug === 'medical_rep'");
    expect(source).not.toMatch(/JOD|طلبات مالية|تحصيل|فاتور|billing|order requests/i);
    expect(css).toContain('var(--color-surface-2)');
    expect(css).toMatch(/@media\s*\(max-width:\s*720px\)/);
  });
});
