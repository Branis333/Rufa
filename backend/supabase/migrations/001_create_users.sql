create extension if not exists pgcrypto;

create table if not exists public.users (
    user_id uuid primary key default gen_random_uuid(),
    fname varchar(100) not null,
    lname varchar(100) not null,
    email varchar(320) not null,
    password_hash varchar(255) not null,
    phone_number varchar(32),
    blood_group varchar(3) check (
        blood_group is null
        or blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    ),
    location varchar(255),
    date_of_birth date check (
        date_of_birth is null or date_of_birth <= current_date
    ),
    roles text[] not null default array['user']::text[],
    is_active boolean not null default true,
    is_verified boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists users_email_lower_unique
    on public.users (lower(email));

create or replace function public.set_users_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_users_updated_at();

alter table public.users enable row level security;

revoke all on table public.users from anon, authenticated;
grant select, insert, update, delete on table public.users to service_role;
