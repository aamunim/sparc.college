// i18next-এর key টাইপ-নিরাপদ করে: ভুল বা না-থাকা key হলে TypeScript এরর দেবে।
import type bn from '../../locales/bn.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof bn };
  }
}
