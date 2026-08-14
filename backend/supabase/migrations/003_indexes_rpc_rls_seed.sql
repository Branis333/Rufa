create or replace function public.set_updated_at()
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

drop trigger if exists blood_requests_set_updated_at on public.blood_requests;
create trigger blood_requests_set_updated_at
before update on public.blood_requests
for each row execute function public.set_updated_at();

drop trigger if exists commitments_set_updated_at on public.request_commitments;
create trigger commitments_set_updated_at
before update on public.request_commitments
for each row execute function public.set_updated_at();

drop trigger if exists preferences_set_updated_at on public.user_preferences;
create trigger preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists locations_set_updated_at on public.user_locations;
create trigger locations_set_updated_at
before update on public.user_locations
for each row execute function public.set_updated_at();

drop trigger if exists push_tokens_set_updated_at on public.push_tokens;
create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

create index if not exists hospitals_city_idx
    on public.hospitals (city) where is_active;
create index if not exists blood_requests_status_created_idx
    on public.blood_requests (status, created_at desc);
create index if not exists blood_requests_requester_idx
    on public.blood_requests (requester_id, created_at desc);
create index if not exists commitments_donor_idx
    on public.request_commitments (donor_id, created_at desc);
create index if not exists notifications_user_unread_idx
    on public.notifications (user_id, created_at desc) where not is_read;
create index if not exists activities_user_occurred_idx
    on public.activity_events (user_id, occurred_at desc);
create index if not exists messages_conversation_sent_idx
    on public.messages (conversation_id, sent_at desc);
create index if not exists contributions_user_created_idx
    on public.contributions (user_id, created_at desc);
create unique index if not exists verification_one_pending_per_user
    on public.verification_applications (user_id) where status = 'pending';

create or replace function public.distance_km(
    p_lat_a double precision,
    p_lng_a double precision,
    p_lat_b double precision,
    p_lng_b double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
    select st_distance(
        st_setsrid(st_makepoint(p_lng_a, p_lat_a), 4326)::geography,
        st_setsrid(st_makepoint(p_lng_b, p_lat_b), 4326)::geography
    ) / 1000.0;
$$;

create or replace function public.nearby_hospitals(
    p_lat double precision,
    p_lng double precision,
    p_radius_km double precision default 50,
    p_query text default null,
    p_limit integer default 50
)
returns table (
    hospital_id uuid,
    name varchar,
    address varchar,
    city varchar,
    latitude double precision,
    longitude double precision,
    phone varchar,
    is_active boolean,
    created_at timestamptz,
    distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
    select
        h.hospital_id, h.name, h.address, h.city, h.latitude, h.longitude,
        h.phone, h.is_active, h.created_at,
        public.distance_km(p_lat, p_lng, h.latitude, h.longitude)
    from public.hospitals h
    where h.is_active
      and public.distance_km(p_lat, p_lng, h.latitude, h.longitude)
          <= p_radius_km
      and (
          p_query is null
          or h.name ilike '%' || p_query || '%'
          or h.city ilike '%' || p_query || '%'
      )
    order by distance_km
    limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.nearby_blood_requests(
    p_lat double precision,
    p_lng double precision,
    p_radius_km double precision default 25,
    p_blood_group text default null,
    p_urgency text default null,
    p_limit integer default 25
)
returns table (
    request_id uuid,
    requester_id uuid,
    hospital_id uuid,
    blood_group varchar,
    bags_needed integer,
    bags_committed integer,
    urgency varchar,
    status varchar,
    broadcast_mode varchar,
    recipient_display_name varchar,
    recipient_latitude double precision,
    recipient_longitude double precision,
    search_radius_km integer,
    created_at timestamptz,
    updated_at timestamptz,
    distance_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
    select
        r.request_id, r.requester_id, r.hospital_id, r.blood_group,
        r.bags_needed, r.bags_committed, r.urgency, r.status,
        r.broadcast_mode, r.recipient_display_name, r.recipient_latitude,
        r.recipient_longitude, r.search_radius_km, r.created_at, r.updated_at,
        public.distance_km(
            p_lat, p_lng, r.recipient_latitude, r.recipient_longitude
        )
    from public.blood_requests r
    where r.status in ('open', 'partially_matched')
      and r.recipient_latitude is not null
      and public.distance_km(
          p_lat, p_lng, r.recipient_latitude, r.recipient_longitude
      ) <= least(p_radius_km, r.search_radius_km)
      and (p_blood_group is null or r.blood_group = p_blood_group)
      and (p_urgency is null or r.urgency = p_urgency)
    order by
        case when r.urgency = 'Critical' then 0 else 1 end,
        distance_km,
        r.created_at desc
    limit least(greatest(p_limit, 1), 100);
$$;

create or replace function public.search_compatible_donors(
    p_blood_group text,
    p_lat double precision,
    p_lng double precision,
    p_radius_km double precision default 25,
    p_limit integer default 25
)
returns table (
    user_id uuid,
    display_name text,
    blood_group varchar,
    distance_km double precision,
    is_verified boolean,
    rating_avg numeric
)
language sql
stable
security definer
set search_path = public
as $$
    select
        u.user_id,
        coalesce(u.display_name, trim(u.fname || ' ' || u.lname)),
        u.blood_group,
        public.distance_km(p_lat, p_lng, l.latitude, l.longitude),
        u.is_verified,
        u.rating_avg
    from public.users u
    join public.user_locations l using (user_id)
    join public.user_preferences p using (user_id)
    where u.is_active
      and u.blood_group is not null
      and l.permission_granted
      and p.availability_status = 'available'
      and public.distance_km(p_lat, p_lng, l.latitude, l.longitude)
          <= least(p_radius_km, p.max_travel_radius_km)
      and u.blood_group = any (
          case p_blood_group
              when 'O-' then array['O-']
              when 'O+' then array['O-', 'O+']
              when 'A-' then array['O-', 'A-']
              when 'A+' then array['O-', 'O+', 'A-', 'A+']
              when 'B-' then array['O-', 'B-']
              when 'B+' then array['O-', 'O+', 'B-', 'B+']
              when 'AB-' then array['O-', 'A-', 'B-', 'AB-']
              when 'AB+' then array[
                  'O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'
              ]
              else array[]::text[]
          end
      )
    order by is_verified desc, distance_km, rating_avg desc
    limit least(greatest(p_limit, 1), 100);
$$;

insert into public.hospitals (
    name, address, city, latitude, longitude, phone
)
select *
from (
    values
        (
            'Central Community Hospital', '1 Health Avenue', 'Central',
            0.3476::double precision, 32.5825::double precision, '+256700000001'
        ),
        (
            'Northside Medical Centre', '24 North Road', 'Northside',
            0.3760::double precision, 32.5750::double precision, '+256700000002'
        ),
        (
            'Lakeside Regional Hospital', '8 Lake Drive', 'Lakeside',
            0.3100::double precision, 32.6200::double precision, '+256700000003'
        )
) as seed(name, address, city, latitude, longitude, phone)
where not exists (
    select 1 from public.hospitals h where h.name = seed.name
);

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'user_preferences', 'user_locations', 'hospitals', 'blood_requests',
        'request_commitments', 'eligibility_checks', 'donations',
        'activity_events', 'notifications', 'verification_applications',
        'conversations', 'messages', 'contributions', 'push_tokens',
        'password_reset_tokens'
    ]
    loop
        execute format('alter table public.%I enable row level security', table_name);
        execute format(
            'revoke all on table public.%I from anon, authenticated', table_name
        );
        execute format(
            'grant select, insert, update, delete on table public.%I to service_role',
            table_name
        );
    end loop;
end;
$$;

revoke all on function public.nearby_hospitals(
    double precision, double precision, double precision, text, integer
) from public;
revoke all on function public.nearby_blood_requests(
    double precision, double precision, double precision, text, text, integer
) from public;
revoke all on function public.search_compatible_donors(
    text, double precision, double precision, double precision, integer
) from public;
grant execute on function public.nearby_hospitals(
    double precision, double precision, double precision, text, integer
) to service_role;
grant execute on function public.nearby_blood_requests(
    double precision, double precision, double precision, text, text, integer
) to service_role;
grant execute on function public.search_compatible_donors(
    text, double precision, double precision, double precision, integer
) to service_role;
