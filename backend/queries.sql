-- Users table for login/register (name, phone, aadhaar)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  aadhaar text not null,
  created_at timestamptz not null default now(),
  unique (phone),
  unique (aadhaar)
);

-- Optional row level security and policies
alter table public.users enable row level security;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Enable read for anon';
  if not found then
    create policy "Enable read for anon" on public.users for select using (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Enable insert for anon';
  if not found then
    create policy "Enable insert for anon" on public.users for insert with check (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'users' and policyname = 'Enable update for anon';
  if not found then
    create policy "Enable update for anon" on public.users for update using (true);
  end if;
end $$;

-- Emergency contacts linked to users
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

alter table public.contacts enable row level security;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and policyname = 'Contacts select';
  if not found then
    create policy "Contacts select" on public.contacts for select using (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and policyname = 'Contacts insert';
  if not found then
    create policy "Contacts insert" on public.contacts for insert with check (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and policyname = 'Contacts update';
  if not found then
    create policy "Contacts update" on public.contacts for update using (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'contacts' and policyname = 'Contacts delete';
  if not found then
    create policy "Contacts delete" on public.contacts for delete using (true);
  end if;
end $$;


-- Safety reports/markers linked to users
create table if not exists public.safety_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  latitude decimal(10, 8) not null,
  longitude decimal(11, 8) not null,
  safety_level text not null check (safety_level in ('safe', 'moderate', 'unsafe', 'dangerous')),
  description text,
  created_at timestamptz not null default now()
);

alter table public.safety_reports enable row level security;
do $$ begin
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'safety_reports' and policyname = 'Safety reports select';
  if not found then
    create policy "Safety reports select" on public.safety_reports for select using (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'safety_reports' and policyname = 'Safety reports insert';
  if not found then
    create policy "Safety reports insert" on public.safety_reports for insert with check (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'safety_reports' and policyname = 'Safety reports update';
  if not found then
    create policy "Safety reports update" on public.safety_reports for update using (true);
  end if;
  perform 1 from pg_policies where schemaname = 'public' and tablename = 'safety_reports' and policyname = 'Safety reports delete';
  if not found then
  
    create policy "Safety reports delete" on public.safety_reports for delete using (true);
  end if;
end $$;

