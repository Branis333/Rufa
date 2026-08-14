create extension if not exists postgis;

alter table public.users
    add column if not exists display_name varchar(100),
    add column if not exists rating_avg numeric(3, 2) not null default 0,
    add column if not exists rating_count integer not null default 0,
    add column if not exists last_donation_at timestamptz;

create table if not exists public.user_preferences (
    user_id uuid primary key references public.users(user_id) on delete cascade,
    max_travel_radius_km integer not null default 25 check (
        max_travel_radius_km between 5 and 100
    ),
    availability_status varchar(20) not null default 'available' check (
        availability_status in ('available', 'unavailable', 'donating')
    ),
    notify_urgent_requests boolean not null default true,
    notify_request_updates boolean not null default true,
    notify_donation_reminders boolean not null default true,
    notify_chat_messages boolean not null default true,
    updated_at timestamptz not null default now()
);

create table if not exists public.user_locations (
    user_id uuid primary key references public.users(user_id) on delete cascade,
    latitude double precision check (latitude between -90 and 90),
    longitude double precision check (longitude between -180 and 180),
    city varchar(100),
    region varchar(100),
    country_code char(2),
    permission_granted boolean not null default false,
    updated_at timestamptz not null default now(),
    check (
        (latitude is null and longitude is null)
        or (latitude is not null and longitude is not null)
    )
);

create table if not exists public.hospitals (
    hospital_id uuid primary key default gen_random_uuid(),
    name varchar(200) not null,
    address varchar(255),
    city varchar(100),
    latitude double precision not null check (latitude between -90 and 90),
    longitude double precision not null check (longitude between -180 and 180),
    phone varchar(32),
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.blood_requests (
    request_id uuid primary key default gen_random_uuid(),
    requester_id uuid not null references public.users(user_id) on delete cascade,
    hospital_id uuid not null references public.hospitals(hospital_id),
    blood_group varchar(3) not null check (
        blood_group in ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
    ),
    bags_needed integer not null check (bags_needed between 1 and 20),
    bags_committed integer not null default 0 check (bags_committed >= 0),
    urgency varchar(20) not null check (urgency in ('Critical', 'Urgent')),
    status varchar(32) not null default 'open' check (
        status in (
            'open', 'partially_matched', 'matched', 'in_progress',
            'completed', 'cancelled'
        )
    ),
    broadcast_mode varchar(16) not null default 'nearby' check (
        broadcast_mode in ('nearby', 'direct')
    ),
    recipient_display_name varchar(100) not null,
    recipient_latitude double precision check (
        recipient_latitude between -90 and 90
    ),
    recipient_longitude double precision check (
        recipient_longitude between -180 and 180
    ),
    search_radius_km integer not null default 25 check (
        search_radius_km between 5 and 100
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (bags_committed <= bags_needed),
    check (
        (recipient_latitude is null and recipient_longitude is null)
        or (
            recipient_latitude is not null
            and recipient_longitude is not null
        )
    )
);

create table if not exists public.request_commitments (
    commitment_id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.blood_requests(request_id)
        on delete cascade,
    donor_id uuid not null references public.users(user_id) on delete cascade,
    status varchar(32) not null default 'pending_eligibility' check (
        status in (
            'pending_eligibility', 'accepted', 'moving', 'arrived',
            'completed', 'declined', 'ineligible', 'cancelled'
        )
    ),
    bags_committed integer not null default 1 check (bags_committed = 1),
    decline_reason varchar(255),
    last_latitude double precision check (last_latitude between -90 and 90),
    last_longitude double precision check (last_longitude between -180 and 180),
    eta_seconds integer check (eta_seconds between 0 and 86400),
    accepted_at timestamptz,
    moving_started_at timestamptz,
    arrived_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (request_id, donor_id)
);

create table if not exists public.eligibility_checks (
    check_id uuid primary key default gen_random_uuid(),
    commitment_id uuid not null unique references public.request_commitments(
        commitment_id
    ) on delete cascade,
    answers jsonb not null,
    failed_question_ids text[] not null default '{}',
    result varchar(16) not null check (result in ('eligible', 'ineligible')),
    question_set_version integer not null default 1,
    submitted_at timestamptz not null default now()
);

create table if not exists public.donations (
    donation_id uuid primary key default gen_random_uuid(),
    commitment_id uuid not null unique references public.request_commitments(
        commitment_id
    ),
    donor_id uuid not null references public.users(user_id),
    request_id uuid not null references public.blood_requests(request_id),
    hospital_id uuid not null references public.hospitals(hospital_id),
    bags_donated integer not null default 1 check (bags_donated = 1),
    lives_helped_estimate integer not null default 3 check (
        lives_helped_estimate >= 0
    ),
    completed_at timestamptz not null default now()
);

create table if not exists public.activity_events (
    activity_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(user_id) on delete cascade,
    category varchar(20) not null check (
        category in ('donation', 'request', 'support')
    ),
    status varchar(32) not null,
    title varchar(160) not null,
    subtitle varchar(255),
    bags integer not null default 0 check (bags >= 0),
    amount_cents integer check (amount_cents >= 0),
    occurred_at timestamptz not null default now()
);

create table if not exists public.notifications (
    notification_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(user_id) on delete cascade,
    type varchar(40) not null,
    title varchar(160) not null,
    message varchar(500) not null,
    payload jsonb not null default '{}',
    is_read boolean not null default false,
    read_at timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.verification_applications (
    application_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(user_id) on delete cascade,
    document_type varchar(32) not null,
    document_reference varchar(255) not null,
    selfie_reference varchar(255),
    status varchar(20) not null default 'pending' check (
        status in ('pending', 'verified', 'rejected')
    ),
    submitted_at timestamptz not null default now(),
    reviewed_at timestamptz,
    reviewer_id uuid references public.users(user_id),
    review_notes varchar(1000)
);

create table if not exists public.conversations (
    conversation_id uuid primary key default gen_random_uuid(),
    request_id uuid not null references public.blood_requests(request_id)
        on delete cascade,
    commitment_id uuid not null unique references public.request_commitments(
        commitment_id
    ) on delete cascade,
    requester_id uuid not null references public.users(user_id),
    donor_id uuid not null references public.users(user_id),
    created_at timestamptz not null default now()
);

create table if not exists public.messages (
    message_id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(
        conversation_id
    ) on delete cascade,
    sender_id uuid not null references public.users(user_id),
    body varchar(2000) not null check (length(trim(body)) > 0),
    sent_at timestamptz not null default now(),
    read_at timestamptz
);

create table if not exists public.contributions (
    contribution_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(user_id) on delete cascade,
    amount_cents integer not null check (
        amount_cents between 100 and 10000000
    ),
    currency char(3) not null default 'USD',
    provider varchar(64) not null,
    provider_reference varchar(255),
    status varchar(20) not null default 'pending' check (
        status in ('pending', 'succeeded', 'failed', 'refunded')
    ),
    campaign_code varchar(64) not null default 'general',
    created_at timestamptz not null default now(),
    succeeded_at timestamptz
);

create table if not exists public.push_tokens (
    push_token_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(user_id) on delete cascade,
    token varchar(512) not null unique,
    platform varchar(16) not null check (platform in ('ios', 'android', 'web')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.password_reset_tokens (
    reset_token_id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(user_id) on delete cascade,
    token_hash char(64) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);
