-- ==============================================================================
-- ARCHIVE ROOM MANAGEMENT SYSTEM (ARMS) - SUPABASE POSTGRESQL SCHEMA
-- Adsia Logistics, Inc.
-- Role-Based Access: management (Admin), custodian / encoder (Standard User)
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. USER PROFILES TABLE (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null default 'custodian' check (role in ('management', 'custodian', 'encoder', 'admin')),
  role_title text not null default 'Archive Custodian',
  department text default 'Warehouse Operations & Archive Custody',
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. RECORDS TABLE (Master archive repository)
create table if not exists public.records (
  id uuid default gen_random_uuid() primary key,
  arms_ref text unique not null,
  transaction_type text not null,
  material_doc text,
  delivery_po text,
  gr_date text not null,
  material_number text,
  vendor_site_number text,
  vam_number text,
  freight_order text,
  num_packages integer default 1,
  operator text,
  encoder text,
  checker text,
  plate_number text,
  location_zone text not null default 'Zone A',
  location_shelf text not null default 'Shelf 01',
  location_folder text not null default 'Folder 01',
  location_code text not null default 'A01',
  retention_date text not null,
  retention_status text not null default 'Active' check (retention_status in ('Active', 'Semi-Active', 'Near Expiry', 'Disposal Due')),
  remarks text,
  status text not null default 'Available' check (status in ('Available', 'Borrowed', 'Pending')),
  custodian text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. RECORD BATCHES TABLE (Dynamic repeatable line items)
create table if not exists public.record_batches (
  id uuid default gen_random_uuid() primary key,
  record_id uuid references public.records(id) on delete cascade not null,
  batch_code text not null,
  prod_date text not null,
  exp_date text not null,
  quantity text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. DAILY SHIFT LOG COUNTS TABLE
create table if not exists public.log_counts (
  id uuid default gen_random_uuid() primary key,
  date text not null,
  inbound integer not null default 0,
  outbound integer not null default 0,
  scrap integer not null default 0,
  inventory integer not null default 0,
  rh_temp integer not null default 0,
  rack_inspections integer not null default 0,
  mhe_pre_ops integer not null default 0,
  submitted_by text not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. BORROW REQUESTS TABLE (Pull-out slips & requisitions)
create table if not exists public.borrow_requests (
  id uuid default gen_random_uuid() primary key,
  transaction_series text unique not null,
  arms_ref text not null,
  record_id uuid references public.records(id) on delete set null,
  family_name text not null,
  given_name text not null,
  designation text not null,
  purpose text not null,
  request_date text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Returned')),
  approved_by text,
  approved_by_id uuid references auth.users(id) on delete set null,
  approved_date text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  transaction_series text,
  arms_ref text,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'System')),
  is_read boolean not null default false,
  is_starred boolean not null default false,
  borrow_request_id uuid references public.borrow_requests(id) on delete cascade,
  borrower_name text,
  designation text,
  purpose text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. ACTIVITY LOGS TABLE (Populated strictly by authenticated user actions)
create table if not exists public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('login', 'logout', 'upload', 'borrow', 'approval', 'reject', 'return', 'log_count')),
  title text not null,
  description text not null,
  arms_ref text,
  user_name text not null,
  user_email text,
  user_id uuid references auth.users(id) on delete set null,
  status_badge text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.record_batches enable row level security;
alter table public.log_counts enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- 10. POLICIES: AUTHENTICATED READ/WRITE
-- Profiles
create policy "Allow read profiles to authenticated users" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "Allow user update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Allow insert on user creation" on public.profiles
  for insert with check (true);

-- Records
create policy "Allow select on records" on public.records
  for select using (true);
create policy "Allow insert on records" on public.records
  for insert with check (auth.role() = 'authenticated');
create policy "Allow update on records" on public.records
  for update using (auth.role() = 'authenticated');
create policy "Allow delete on records" on public.records
  for delete using (auth.role() = 'authenticated');

-- Record Batches
create policy "Allow select on record_batches" on public.record_batches
  for select using (true);
create policy "Allow insert on record_batches" on public.record_batches
  for insert with check (auth.role() = 'authenticated');
create policy "Allow delete on record_batches" on public.record_batches
  for delete using (auth.role() = 'authenticated');

-- Log Counts
create policy "Allow select on log_counts" on public.log_counts
  for select using (true);
create policy "Allow insert on log_counts" on public.log_counts
  for insert with check (auth.role() = 'authenticated');

-- Borrow Requests
create policy "Allow select on borrow_requests" on public.borrow_requests
  for select using (true);
create policy "Allow insert on borrow_requests" on public.borrow_requests
  for insert with check (auth.role() = 'authenticated');
create policy "Allow update on borrow_requests" on public.borrow_requests
  for update using (auth.role() = 'authenticated');

-- Notifications
create policy "Allow select on notifications" on public.notifications
  for select using (true);
create policy "Allow insert on notifications" on public.notifications
  for insert with check (auth.role() = 'authenticated');
create policy "Allow update on notifications" on public.notifications
  for update using (auth.role() = 'authenticated');
create policy "Allow delete on notifications" on public.notifications
  for delete using (auth.role() = 'authenticated');

-- Activity Logs
create policy "Allow select on activity_logs" on public.activity_logs
  for select using (true);
create policy "Allow insert on activity_logs" on public.activity_logs
  for insert with check (auth.role() = 'authenticated');

-- 11. AUTOMATIC PROFILE CREATION TRIGGER (Default role: 'custodian')
create or replace function public.handle_new_user()
returns trigger as $$
declare
  assigned_role text;
  assigned_title text;
  user_full_name text;
begin
  assigned_role := coalesce(new.raw_user_meta_data->>'role', 'custodian');
  user_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  if assigned_role = 'management' or assigned_role = 'admin' then
    assigned_role := 'management';
    assigned_title := 'Management Admin';
  elsif assigned_role = 'encoder' then
    assigned_title := 'Logistics Encoder';
  else
    assigned_role := 'custodian';
    assigned_title := 'Archive Custodian';
  end if;

  insert into public.profiles (id, email, full_name, role, role_title, department)
  values (
    new.id,
    new.email,
    user_full_name,
    assigned_role,
    assigned_title,
    'Warehouse Operations & Archive Custody'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name);

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 12. ENABLE SUPABASE REALTIME REPLICATION
alter publication supabase_realtime add table public.records;
alter publication supabase_realtime add table public.borrow_requests;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.activity_logs;
alter publication supabase_realtime add table public.log_counts;
alter publication supabase_realtime add table public.profiles;
