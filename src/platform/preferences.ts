// ছোট ইউজার-পছন্দ (ভাষা, থিম) ফোনে/ব্রাউজারে সেভ রাখা। স্টোরেজ না পেলে চুপচাপ ডিফল্টে চলে।
// গোপন কিছু (টোকেন, সেশন) এখানে নয় — সেগুলো SecureStore-এ (§৯.১)।
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readPreference(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`sparc.${key}`);
  } catch {
    return null;
  }
}

export async function writePreference(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`sparc.${key}`, value);
  } catch {
    // সেভ না হলেও এই সেশনে পরিবর্তন কাজ করবে
  }
}
