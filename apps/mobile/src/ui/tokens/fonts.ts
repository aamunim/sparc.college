// ফন্ট পরিবার। বাংলা ফন্ট (Hind Siliguri) ল্যাটিন অক্ষরও সমর্থন করে, তাই বাংলা/ইংরেজি দুই ভাষাতেই এটা।
// আরবি (কুরআন/হাদিস) লেখার জন্য Noto Naskh Arabic (হরকতসহ)। দুটোই SIL OFL লাইসেন্সের।
export const fonts = {
  regular: 'HindSiliguri_400Regular',
  medium: 'HindSiliguri_500Medium',
  semibold: 'HindSiliguri_600SemiBold',
  bold: 'HindSiliguri_700Bold',
  arabic: 'NotoNaskhArabic_400Regular',
  arabicBold: 'NotoNaskhArabic_700Bold',
} as const;
