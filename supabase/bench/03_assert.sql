\set ON_ERROR_STOP on
select name, median_ms, limit_ms, case when median_ms <= limit_ms then 'ok' else 'SLOW' end as status
  from public.bench_results order by name;
do $$
begin
  if exists (select 1 from public.bench_results where median_ms > limit_ms) then
    raise exception 'Benchmark limit exceeded (see table above)';
  end if;
end;
$$;
drop table public.bench_results;
