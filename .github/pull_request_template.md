## কী বদলাল

<!-- সংক্ষেপে, কেন -->

## Deploy type

- [ ] শুধু কোড (OTA দিয়ে যাবে)
- [ ] DB migration
- [ ] Edge Function
- [ ] নেটিভ পরিবর্তন (নতুন store build লাগবে)

## Definition of Done (গাইডলাইন §১৩.২)

- [ ] CI সবুজ (typecheck, lint, format, i18n, test, build)
- [ ] নতুন টেবিলে RLS + pgTAP টেস্ট (অন্য প্রতিষ্ঠান আর অন্যের ID কেসসহ, আসল রোলে)
- [ ] migration শুধু যোগ করে; পুরনো migration অপরিবর্তিত
- [ ] RPC/view-এর signature ভাঙেনি (দরকার হলে `_v2`)
- [ ] নতুন পারমিশন key seed/migration-এ; কোডে `can()`
- [ ] সব লেখা `bn.json` আর `en.json` দুটোতেই
- [ ] লাইট আর ডার্ক দুই থিমে দেখা; লোডিং/খালি/এরর/অফলাইন অবস্থা আছে
- [ ] বড় ফিচার ফিচার ফ্ল্যাগের পেছনে
- [ ] কোনো secret বা ব্যক্তিগত তথ্য কোডে/লগে নেই
