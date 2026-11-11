// অ্যাক্সেসের প্ল্যাটফর্ম-নিরপেক্ষ যুক্তি (মোবাইল + অ্যাডমিন)।
// এটা শুধু UI-র জন্য (কী দেখাবে/লুকাবে) — নিরাপত্তার আসল যাচাই সবসময় ডেটাবেসে (RLS, has_permission)।

/** public.my_access()-এর একটা সারি */
export type AccessEntry = {
  institution_id: string;
  role_keys: string[];
  permissions: string[];
};

/** platform.* পারমিশন সব প্রতিষ্ঠানে প্রযোজ্য (ডেটাবেসের নিয়মের মতো) */
export function canIn(
  access: readonly AccessEntry[],
  institutionId: string | null,
  permission: string,
): boolean {
  if (permission.startsWith('platform.')) {
    return access.some((a) => a.permissions.includes(permission));
  }
  if (!institutionId) return false;
  return access.some(
    (a) => a.institution_id === institutionId && a.permissions.includes(permission),
  );
}

/**
 * সক্রিয় প্রতিষ্ঠান ঠিক করা: আগে বেছে নেওয়াটা এখনো সদস্যপদে থাকলে সেটা;
 * না থাকলে প্রথম স্কুল/কলেজ (SPARC Platform শেষে); কিছু না থাকলে null।
 */
export function pickActiveInstitution(
  access: readonly AccessEntry[],
  preferredId: string | null,
  platformInstitutionId?: string | null,
): string | null {
  if (preferredId && access.some((a) => a.institution_id === preferredId)) return preferredId;
  const nonPlatform = access.find((a) => a.institution_id !== platformInstitutionId);
  return (nonPlatform ?? access[0])?.institution_id ?? null;
}
