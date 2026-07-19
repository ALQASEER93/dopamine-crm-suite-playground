import { describe, expect, it } from 'vitest';

import { normalizeAdminUsersResponse, normalizeTerritoriesResponse } from './AdminUsersPage';

describe('AdminUsersPage response normalizers', () => {
  it('accepts direct arrays and paginated data arrays for users', () => {
    const rows = [{ id: 1, name: 'Admin' }];

    expect(normalizeAdminUsersResponse(rows)).toEqual(rows);
    expect(normalizeAdminUsersResponse({ data: rows, pagination: { total: 1 } })).toEqual(rows);
    expect(normalizeAdminUsersResponse({ rows })).toEqual(rows);
    expect(normalizeAdminUsersResponse({ unexpected: true })).toEqual([]);
  });

  it('accepts direct arrays and paginated data arrays for territories', () => {
    const rows = [{ id: 1, name: 'North' }];

    expect(normalizeTerritoriesResponse(rows)).toEqual(rows);
    expect(normalizeTerritoriesResponse({ data: rows })).toEqual(rows);
    expect(normalizeTerritoriesResponse({ rows })).toEqual(rows);
    expect(normalizeTerritoriesResponse(null)).toEqual([]);
  });
});
