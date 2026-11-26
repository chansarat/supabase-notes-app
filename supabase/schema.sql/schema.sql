create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_updated_at_idx
  on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "Users can manage their own notes" on public.notes;
create policy "Users can manage their own notes"
  on public.notes
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_note_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_note_updated_at on public.notes;
create trigger set_note_updated_at
  before update on public.notes
  for each row
  execute function public.set_note_updated_at();

grant select, insert, update, delete on public.notes to authenticated;
grant usage on schema public to authenticated;
