-- OTP SMS-এর সীমা (§২০.২)
begin;
select plan(9);

-- service_role হিসেবে (Edge Function যেভাবে ডাকে)
set local role service_role;
select is(public.reserve_sms_slot('+8801711000001'), 'OK', '1st OTP allowed');
select is(public.reserve_sms_slot('+8801711000001'), 'OK', '2nd OTP allowed');
select is(public.reserve_sms_slot('8801711000001'), 'OK', '3rd OTP allowed (same number without +)');
select is(public.reserve_sms_slot('+8801711000001'), 'RATE_LIMITED', '4th OTP within 10 minutes is refused');
select is(public.reserve_sms_slot('+8801711000002'), 'OK', 'another number is not affected');
select is(public.reserve_sms_slot('not a phone'), 'INVALID_PHONE', 'invalid phone is refused');
reset role;

select ok(not exists (select 1 from private.sms_log where phone_hash like '%1711000001%'),
  'phone numbers are not stored in clear text');

set local role authenticated;
select throws_ok($$select public.reserve_sms_slot('+8801711000003')$$, '42501', null, 'signed-in users cannot call it');
reset role;
set local role anon;
select throws_ok($$select public.reserve_sms_slot('+8801711000003')$$, '42501', null, 'anon cannot call it');

select * from finish();
rollback;
