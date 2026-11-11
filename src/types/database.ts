// অটো-জেনারেটেড হবে: `npm run db:types` (supabase gen types)। হাতে এডিট করবেন না।
// ফেজ ১-এর প্রথম migration-এর আগে পর্যন্ত এটা খালি স্কিমা।
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: { [_ in never]: never };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
