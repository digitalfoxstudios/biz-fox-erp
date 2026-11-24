-- Cover the two task_reports foreign keys flagged by the Supabase performance advisor.
-- Additive only: no existing rows or workflow semantics are changed.
create index if not exists task_reports_submitted_by_idx
  on public.task_reports(submitted_by);

create index if not exists task_reports_task_id_idx
  on public.task_reports(task_id);
