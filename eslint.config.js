// ESLint flat config (monorepo) — নিয়মের কারণ: docs/DEVELOPMENT-GUIDE.md §৭, §১৩, §১৯
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const i18next = require('eslint-plugin-i18next');

const HEX_COLOR = '/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/';
const FUNC_COLOR = '/^(rgb|rgba|hsl|hsla)\\(/';
const FEATURE_DEEP_IMPORT = {
  group: ['@/features/*/**'],
  message: 'অন্য ফিচারের ভেতরের ফাইল নয় — শুধু "@/features/<name>" (index.ts) থেকে import করুন।',
};
const APP_SRC = [
  'apps/*/src/**/*.{ts,tsx}',
  'apps/admin/app/**/*.{ts,tsx}',
  'packages/*/src/**/*.ts',
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      '**/dist/**',
      '**/.expo/**',
      '**/.next/**',
      '**/out/**',
      '**/node_modules/**',
      'supabase/functions/**',
      'docs/**',
      '**/next-env.d.ts',
    ],
  },
  {
    // monorepo: প্রতিটা অ্যাপের '@/…' alias তার নিজের tsconfig থেকে
    settings: {
      'import/resolver': {
        typescript: { project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'] },
      },
    },
  },
  {
    files: APP_SRC,
    plugins: { i18next },
    rules: {
      // §৭.৬: কোডে কোনো লেখা সরাসরি নয় — সব bn.json / en.json থেকে
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
      // §৭.৯: any নিষেধ
      '@typescript-eslint/no-explicit-any': 'error',
      // §৭.১: এক ফিচার অন্য ফিচারের ভেতরের ফাইল import করবে না
      'no-restricted-imports': ['error', { patterns: [FEATURE_DEEP_IMPORT] }],
      // §১৯.১: রং শুধু ডিজাইন টোকেন থেকে
      'no-restricted-syntax': [
        'error',
        {
          selector: `Literal[value=${HEX_COLOR}]`,
          message: 'সরাসরি রং নয় — রঙের টোকেন ব্যবহার করুন।',
        },
        {
          selector: `Literal[value=${FUNC_COLOR}]`,
          message: 'সরাসরি রং নয় — রঙের টোকেন ব্যবহার করুন।',
        },
      ],
    },
  },
  {
    // রং সংজ্ঞায়িত হয় শুধু এখানে
    files: [
      'packages/core/src/design/**',
      'packages/core/src/__tests__/colors.test.ts',
      'apps/mobile/src/ui/tokens/**',
    ],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // ডেটাবেস কল শুধু ফিচারের api.ts (আর platform/) থেকে — §৭.২
    files: [
      'apps/mobile/src/app/**',
      'apps/mobile/src/features/*/screens/**',
      'apps/mobile/src/features/*/components/**',
      'apps/mobile/src/ui/**',
    ],
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
          patterns: [FEATURE_DEEP_IMPORT],
        },
      ],
    },
  },
  {
    // @sparc/core কোনো প্ল্যাটফর্মের ওপর নির্ভর করবে না (D3a) — মোবাইল আর অ্যাডমিন দুটোই ব্যবহার করে
    files: ['packages/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-*',
                'react-native',
                'react-native-*',
                'expo',
                'expo-*',
                '@expo/*',
                'next',
                'next/*',
                '@react-native-async-storage/*',
                '@/*',
              ],
              message:
                '@sparc/core প্ল্যাটফর্ম-নির্ভর হতে পারবে না — মোবাইলের জন্য apps/mobile/src/platform/, অ্যাডমিনের জন্য apps/admin/-এ রাখুন।',
            },
          ],
        },
      ],
    },
  },
  prettierConfig,
]);
