// লগইন সেশনের নিরাপদ স্টোরেজ (§৯.১)।
// Supabase-এর সেশন SecureStore-এর আকারসীমার চেয়ে বড় হতে পারে, তাই:
//  - প্রতিবার সেভে নতুন র‍্যান্ডম ২৫৬-বিট চাবি → চাবি থাকে SecureStore-এ (Android Keystore দিয়ে এনক্রিপ্টেড)
//  - সেশন AES (CTR) দিয়ে এনক্রিপ্ট করে AsyncStorage-এ
// ওয়েবে SecureStore নেই; সেখানে ব্রাউজারের স্টোরেজ (Supabase-এর স্বাভাবিক আচরণ)।
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedStorage } from '@supabase/supabase-js';
import * as aesjs from 'aes-js';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const keyName = (key: string) => `sparc_sk_${key.replace(/[^A-Za-z0-9._-]/g, '_')}`;

async function encrypt(key: string, value: string): Promise<string> {
  const encryptionKey = getRandomBytes(32);
  const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  await SecureStore.setItemAsync(keyName(key), aesjs.utils.hex.fromBytes(encryptionKey));
  return aesjs.utils.hex.fromBytes(encrypted);
}

async function decrypt(key: string, value: string): Promise<string | null> {
  const hexKey = await SecureStore.getItemAsync(keyName(key));
  if (!hexKey) return null;
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(hexKey),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
}

const encryptedStorage: SupportedStorage = {
  async getItem(key) {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return null;
    try {
      return await decrypt(key, stored);
    } catch {
      return null; // ভাঙা বা পুরনো ডেটা: আবার লগইন করতে হবে
    }
  },
  async setItem(key, value) {
    await AsyncStorage.setItem(key, await encrypt(key, value));
  },
  async removeItem(key) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(keyName(key));
  },
};

export const sessionStorage: SupportedStorage =
  Platform.OS === 'web' ? (AsyncStorage as SupportedStorage) : encryptedStorage;
