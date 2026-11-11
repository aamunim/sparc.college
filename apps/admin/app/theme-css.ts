import { cssVariables } from '@sparc/core';

// রঙের টোকেন (@sparc/core) থেকে CSS ভেরিয়েবল — মোবাইল অ্যাপের মতো একই রং, লাইট/ডার্ক।
function block(scheme: 'light' | 'dark'): string {
  return Object.entries(cssVariables(scheme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
}

export const themeCss = `:root { color-scheme: light; ${block('light')} }
@media (prefers-color-scheme: dark) { :root { color-scheme: dark; ${block('dark')} } }`;
