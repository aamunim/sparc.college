import { Redirect } from 'expo-router';

// Google লগইন শেষে ফেরার ঠিকানা (sparc://auth-callback, ওয়েবে /auth-callback)।
// কোড থেকে সেশন বানানো api.ts (অ্যাপ) বা Supabase নিজে (ওয়েব) করে; এখানে শুধু হোমে ফেরা।
export default function AuthCallback() {
  return <Redirect href="/" />;
}
