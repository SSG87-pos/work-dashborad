insert into public.tag_groups (id, label, tags, tone, sort_order)
values
  ('preset:planning-report', '기획/임원보고', array['기획보고', '임원보고'], 'report', 10),
  ('preset:strategy', '전략/투자 묶음', array['전략과제', '투자검토', '시장동향'], 'strategy', 20),
  ('preset:research', '조사/근거 묶음', array['자료조사', '외부자료', '정책'], 'research', 30),
  ('preset:operations', '운영/KPI 묶음', array['월간보고', '회의체', '운영', 'KPI'], 'operations', 40)
on conflict (id) do update set
  label = excluded.label,
  tags = excluded.tags,
  tone = excluded.tone,
  sort_order = excluded.sort_order,
  updated_at = now();
