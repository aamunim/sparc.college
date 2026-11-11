// সক্রিয় প্রতিষ্ঠান (ইউজারভেদে সেভ থাকে)।
import { create } from 'zustand';

import { readPreference, writePreference } from '@/platform/preferences';

type ActiveInstitutionState = {
  /** userId → বেছে নেওয়া প্রতিষ্ঠান */
  chosen: Record<string, string | null>;
  load: (userId: string) => Promise<void>;
  choose: (userId: string, institutionId: string) => Promise<void>;
};

const prefKey = (userId: string) => `active_institution.${userId}`;

export const useActiveInstitutionStore = create<ActiveInstitutionState>((set) => ({
  chosen: {},
  load: async (userId) => {
    const saved = await readPreference(prefKey(userId));
    set((s) => ({ chosen: { ...s.chosen, [userId]: saved } }));
  },
  choose: async (userId, institutionId) => {
    set((s) => ({ chosen: { ...s.chosen, [userId]: institutionId } }));
    await writePreference(prefKey(userId), institutionId);
  },
}));
