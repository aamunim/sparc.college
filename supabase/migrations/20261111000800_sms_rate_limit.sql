-- ফেজ ২.১ — OTP SMS-এর সীমা (গাইডলাইন §৯.১, §২০.২): একই নম্বরে ১০ মিনিটে ৩টা, দিনে ১০টা।
-- send-sms Edge Function (service_role) পাঠানোর আগে reserve_sms_slot() ডাকে।
-- ফোন নম্বর সরাসরি রাখা হয় না: HMAC(pepper) — শুধু SHA-256 হলে ১১ অঙ্কের নম্বর brute-force-এ উল্টানো যায়।
-- pepper প্রতিটা পরিবেশে আলাদা, Vault-এ (migration চালানোর সময় তৈরি)।

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'sms_log_pepper',
  'HMAC key for hashing phone numbers in private.sms_log');

create table private.sms_log (
  id bigint generated always as identity primary key,
  phone_hash text not null,
  kind text not null check (kind in ('otp', 'notification')),
  created_at timestamptz not null default now()
);
create index sms_log_phone_time on private.sms_log (phone_hash, created_at desc);
revoke all on private.sms_log from public, anon, authenticated;

create function private.reserve_sms_slot(p_phone text, p_kind text default 'otp')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pepper text;
  v_hash text;
  v_last_10min integer;
  v_last_day integer;
begin
  if p_phone is null or p_phone !~ '^\+?[0-9]{8,15}$' then
    return 'INVALID_PHONE';
  end if;
  select decrypted_secret into v_pepper from vault.decrypted_secrets where name = 'sms_log_pepper';
  v_hash := encode(extensions.hmac(ltrim(p_phone, '+'), v_pepper, 'sha256'), 'hex');

  -- একই নম্বরের জন্য একসাথে দুটো অনুরোধ এলে race এড়াতে
  perform pg_advisory_xact_lock(hashtextextended(v_hash, 0));

  if p_kind = 'otp' then
    select count(*) filter (where created_at > now() - interval '10 minutes'),
           count(*) filter (where created_at > now() - interval '1 day')
      into v_last_10min, v_last_day
      from private.sms_log
     where phone_hash = v_hash and kind = 'otp' and created_at > now() - interval '1 day';
    if v_last_10min >= 3 or v_last_day >= 10 then
      return 'RATE_LIMITED';
    end if;
  end if;

  insert into private.sms_log (phone_hash, kind) values (v_hash, p_kind);
  return 'OK';
end;
$$;
revoke all on function private.reserve_sms_slot(text, text) from public, anon, authenticated;
grant execute on function private.reserve_sms_slot(text, text) to service_role;

-- Edge Function PostgREST দিয়ে ডাকে, তাই public-এ INVOKER wrapper — শুধু service_role চালাতে পারে
create function public.reserve_sms_slot(p_phone text, p_kind text default 'otp')
returns text
language sql
security invoker
set search_path = ''
as $$ select private.reserve_sms_slot(p_phone, p_kind); $$;
revoke all on function public.reserve_sms_slot(text, text) from public, anon, authenticated;
grant execute on function public.reserve_sms_slot(text, text) to service_role;

-- ৭ দিনের পুরনো লগ মোছা (শুধু সীমার জন্য রাখা; ব্যক্তিগত তথ্য কম রাখা — §৯.৮)
select cron.schedule('sms-log-purge', '41 2 * * *', $$delete from private.sms_log where created_at < now() - interval '7 days'$$);
