import { canIn, pickActiveInstitution, type AccessEntry } from '../access';
import { filterRegistry } from '../registry';
import { compareVersions, updateStatus } from '../version';

const access: AccessEntry[] = [
  {
    institution_id: 'A',
    role_keys: ['institution_admin'],
    permissions: ['member.read', 'role.assign'],
  },
  { institution_id: 'B', role_keys: ['teacher'], permissions: ['institution.read'] },
  { institution_id: 'P', role_keys: ['platform_admin'], permissions: ['platform.manage'] },
];

describe('canIn', () => {
  it('checks the permission in the given institution only', () => {
    expect(canIn(access, 'A', 'member.read')).toBe(true);
    expect(canIn(access, 'B', 'member.read')).toBe(false);
    expect(canIn(access, null, 'member.read')).toBe(false);
  });
  it('treats platform.* permissions as global', () => {
    expect(canIn(access, 'B', 'platform.manage')).toBe(true);
  });
});

describe('pickActiveInstitution', () => {
  it('keeps the preferred institution while still a member', () => {
    expect(pickActiveInstitution(access, 'B', 'P')).toBe('B');
  });
  it('falls back to the first school, not the platform', () => {
    expect(pickActiveInstitution([access[2], access[1]], 'gone', 'P')).toBe('B');
  });
  it('returns null without memberships', () => {
    expect(pickActiveInstitution([], 'A')).toBeNull();
  });
});

describe('filterRegistry', () => {
  const items = [
    { key: 'members', titleKey: 'x', permission: 'member.read', order: 2 },
    { key: 'learn', titleKey: 'x', order: 1 },
    { key: 'beta', titleKey: 'x', feature: 'beta_thing' },
  ];
  it('filters by permission and feature and sorts by order', () => {
    const result = filterRegistry(items, {
      can: (p) => p === 'member.read',
      featureEnabled: () => false,
    });
    expect(result.map((i) => i.key)).toEqual(['learn', 'members']);
  });
});

describe('version', () => {
  it('compares semantic versions', () => {
    expect(compareVersions('1.2.10', '1.2.9')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
    expect(compareVersions('bad', '1.0.0')).toBeNull();
  });
  it('decides when an update is required', () => {
    const policy = { min_supported_version: '1.2.0', latest_version: '1.4.0' };
    expect(updateStatus('1.1.9', policy)).toBe('required');
    expect(updateStatus('1.3.0', policy)).toBe('available');
    expect(updateStatus('1.4.0', policy)).toBe('ok');
    expect(updateStatus(null, policy)).toBe('ok');
    expect(updateStatus('1.0.0', null)).toBe('ok');
  });
});
