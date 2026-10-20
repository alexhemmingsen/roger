-- Only the server reads and writes these tables, using the secret key (which bypasses row level security).
-- RLS is enabled with no policies, so the app's publishable key cannot read or change anything directly.

-- One row per signed-up user. The id is the Supabase Auth user id (anonymous sign-in).
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- The primary key covers lookups by conversation. This one covers "which conversations am I in".
create index conversation_members_user_id_idx on public.conversation_members (user_id);

-- One row per transmission (one press of the talk button). The audio itself is not stored.
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- Kept as null if the sender is deleted, so the conversation history stays intact.
  sender_id uuid references public.users (id) on delete set null,
  -- Null until transcription finishes.
  transcript text,
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at);

alter table public.users enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
