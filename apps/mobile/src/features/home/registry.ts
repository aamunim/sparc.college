import type { RegistryItem } from '@sparc/core';

// হোমের মেনু (রেজিস্ট্রি, §৭.৪)। নতুন মডিউল এলে শুধু এখানে একটা আইটেম যোগ হবে।
// permission/feature না মিললে আইটেম দেখায় না — আসল নিরাপত্তা ডেটাবেসে।
export const homeMenu: RegistryItem[] = [
  { key: 'learn', titleKey: 'menu.learn', order: 10 },
  { key: 'members', titleKey: 'menu.members', permission: 'member.read', order: 20 },
  { key: 'roles', titleKey: 'menu.roles', permission: 'role.assign', order: 30 },
  { key: 'settings', titleKey: 'menu.settings', permission: 'settings.manage', order: 40 },
  { key: 'audit', titleKey: 'menu.audit', permission: 'audit.read', order: 50 },
  { key: 'platform', titleKey: 'menu.platform', permission: 'platform.manage', order: 60 },
];
