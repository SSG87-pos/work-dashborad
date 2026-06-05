update public.tag_groups
set label = case id
  when 'preset:strategy' then '전략/투자'
  when 'preset:research' then '조사/근거'
  when 'preset:operations' then '운영/KPI'
  else label
end
where id in ('preset:strategy', 'preset:research', 'preset:operations');
