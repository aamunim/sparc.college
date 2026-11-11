// রেজিস্ট্রি প্যাটার্ন (§৭.৪): ট্যাব, মেনু, উইজেট এক তালিকায়; পারমিশন আর ফিচার ফ্ল্যাগ দেখে ফিল্টার।
// নতুন মেনু = তালিকায় একটা আইটেম; পুরনো স্ক্রিনে হাত দিতে হয় না।

export type RegistryItem = {
  key: string;
  /** অনুবাদের key (bn/en) */
  titleKey: string;
  /** দেখাতে এই পারমিশন লাগবে (সক্রিয় প্রতিষ্ঠানে) */
  permission?: string;
  /** দেখাতে এই ফিচার চালু থাকতে হবে */
  feature?: string;
  order?: number;
};

export function filterRegistry<T extends RegistryItem>(
  items: readonly T[],
  ctx: { can: (permission: string) => boolean; featureEnabled: (feature: string) => boolean },
): T[] {
  return items
    .filter((item) => !item.permission || ctx.can(item.permission))
    .filter((item) => !item.feature || ctx.featureEnabled(item.feature))
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}
