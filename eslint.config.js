// ESLint flat config — নিয়মের কারণ: docs/DEVELOPMENT-GUIDE.md §৭, §১৩, §১৯
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const i18next = require('eslint-plugin-i18next');

const HEX_COLOR = '/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/';
const FUNC_COLOR = '/^(rgb|rgba|hsl|hsla)\\(/';

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'supabase/functions/*', 'docs/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      // §৭.৬: কোডে কোনো লেখা সরাসরি নয় — সব bn.json / en.json থেকে
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],

      // §৭.৯: any নিষেধ
      '@typescript-eslint/no-explicit-any': 'error',

      // §৭.১: এক ফিচার অন্য ফিচারের ভেতরের ফাইল import করবে না, শুধু index.ts দিয়ে।
      // ফিচারের নিজের ভেতরে relative import ব্যবহার করুন।
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/**'],
              message:
                'অন্য ফিচারের ভেতরের ফাইল নয় — শুধু "@/features/<name>" (index.ts) থেকে import করুন।',
            },
          ],
        },
      ],

      // §১৯.১: রং শুধু ডিজাইন টোকেন থেকে; কোডে সরাসরি রং নিষেধ
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${HEX_COLOR}]`,
          message: 'সরাসরি রং নয় — ui/ এর রং টোকেন ব্যবহার করুন।',
        },
        {
          selector: `Literal[value=${FUNC_COLOR}]`,
          message: 'সরাসরি রং নয় — ui/ এর রং টোকেন ব্যবহার করুন।',
        },
      ],
    },
  },
  {
    // রং টোকেন সংজ্ঞায়িত হয় শুধু এখানে
    files: ['src/ui/tokens/**'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // ডেটাবেস কল শুধু ফিচারের api.ts (আর core/) থেকে — §৭.২
    files: ['src/app/**', 'src/features/*/screens/**', 'src/features/*/components/**', 'src/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'স্ক্রিন/কম্পোনেন্ট সরাসরি Supabase ডাকবে না — ফিচারের api.ts ব্যবহার করুন।',
            },
          ],
          patterns: [
            {
              group: ['@/features/*/**'],
              message:
                'অন্য ফিচারের ভেতরের ফাইল নয় — শুধু "@/features/<name>" (index.ts) থেকে import করুন।',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
]);
