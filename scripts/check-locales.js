// bn.json আর en.json-এর key হুবহু মিলছে কিনা যাচাই করে (CI-তে চলবে)।
const bn = require('../packages/core/src/locales/bn.json');
const en = require('../packages/core/src/locales/en.json');

function keys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const bnKeys = new Set(keys(bn));
const enKeys = new Set(keys(en));
const missingInEn = [...bnKeys].filter((k) => !enKeys.has(k));
const missingInBn = [...enKeys].filter((k) => !bnKeys.has(k));

if (missingInEn.length || missingInBn.length) {
  if (missingInEn.length) console.error('en.json-এ নেই:', missingInEn.join(', '));
  if (missingInBn.length) console.error('bn.json-এ নেই:', missingInBn.join(', '));
  process.exit(1);
}
console.log(`Locale keys OK (${bnKeys.size})`);
