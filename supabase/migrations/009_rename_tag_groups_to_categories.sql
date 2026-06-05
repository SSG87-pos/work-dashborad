update public.tag_groups
set label = case id
  when 'preset:strategy' then '전략/투자 Category'
  when 'preset:research' then '조사/근거 Category'
  when 'preset:operations' then '운영/KPI Category'
  else label
end
where id in ('preset:strategy', 'preset:research', 'preset:operations');
