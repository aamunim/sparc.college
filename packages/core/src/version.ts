// অ্যাপ ভার্সন তুলনা (force update, §১২.৫)।

function parse(version: string): [number, number, number] | null {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** a < b → -1, a = b → 0, a > b → 1; অবৈধ ভার্সন হলে null */
export function compareVersions(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

export type VersionPolicy = { min_supported_version: string; latest_version: string };

/**
 * 'required' = এই ভার্সনে আর চলবে না; 'available' = নতুন ভার্সন আছে; 'ok'।
 * ভার্সন বোঝা না গেলে 'ok' — অনিশ্চয়তায় ব্যবহারকারীকে আটকানো হবে না।
 */
export function updateStatus(
  current: string | null,
  policy: VersionPolicy | null,
): 'required' | 'available' | 'ok' {
  if (!current || !policy) return 'ok';
  if (compareVersions(current, policy.min_supported_version) === -1) return 'required';
  if (compareVersions(current, policy.latest_version) === -1) return 'available';
  return 'ok';
}
