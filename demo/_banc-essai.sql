-- ============================================================================
-- BANC D'ESSAI — reproduction locale du schéma EduCam pour tester le seed.
-- Ce fichier N'EST PAS destiné à Supabase. Il sert uniquement à faire tourner
-- `demo-01-seed.sql` et `demo-00-teardown.sql` sur un PostgreSQL jetable, avant
-- de les envoyer sur la vraie base. Colonnes reconstituées d'après le code de
-- l'application et les migrations du projet.
-- ============================================================================
create schema if not exists auth;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255), role varchar(255),
  email varchar(255) unique,
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz,
  confirmation_token varchar(255) default '',
  recovery_token varchar(255) default '',
  email_change_token_new varchar(255) default '',
  email_change varchar(255) default ''
);

create table auth.identities (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz
);

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null, region text, staff_code text unique,
  created_at timestamptz default now()
);

create table public.teachers (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null, school_name text,
  level text default 'cm1',
  role text not null default 'reviewer',
  school_id uuid references public.schools(id) on delete set null,
  parent_passcode text, class_label text,
  created_at timestamptz default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  full_name text not null,
  access_code text unique,
  parent_email text,
  created_at timestamptz default now()
);

create table public.parents (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  linked_teacher_id uuid references public.teachers(id),
  student_id uuid references public.students(id) on delete cascade,
  created_at timestamptz default now()
);

create table public.lessons (
  id serial primary key,
  subject_id text not null, component_id text not null, level text not null,
  unit_number int not null, week_number int not null default 1,
  theme text not null, title text not null, objective text,
  duration text default '45 minutes',
  created_at timestamptz default now()
);

create table public.lessons_taught (
  id serial primary key,
  teacher_id uuid references auth.users(id) on delete cascade,
  lesson_id int references public.lessons(id) on delete cascade,
  taught_at timestamptz default now(),
  unique (teacher_id, lesson_id)
);

create table public.teacher_readiness (
  id serial primary key, teacher_id uuid references auth.users(id),
  lesson_id int references public.lessons(id),
  score int not null, total_questions int not null, passed boolean not null,
  completed_at timestamptz default now(), unique (teacher_id, lesson_id)
);

create table public.lesson_feedback (
  id serial primary key, teacher_id uuid, lesson_id int, section_id int,
  section_title text, rating int, comment text,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  processed_at timestamptz, processed_by uuid
);

create table public.daily_results (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  lesson_id int references public.lessons(id) on delete set null,
  school_id uuid references public.schools(id) on delete cascade,
  teacher_id uuid references public.teachers(id) on delete set null,
  result_date date not null,
  score int, total int, difficulty boolean default false,
  entered_by uuid, created_at timestamptz default now(),
  unique (student_id, lesson_id, result_date)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id),
  sender_id uuid, audience text not null, recipient_id uuid,
  student_id uuid references public.students(id) on delete set null,
  subject text, body text not null, link_url text,
  created_at timestamptz default now(), read_at timestamptz
);

create table public.school_observations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  author_id uuid, body text not null, created_at timestamptz default now()
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid, actor_role text,
  school_id uuid references public.schools(id) on delete cascade,
  event_type text not null, lesson_id int, detail text,
  created_at timestamptz default now()
);

create table public.timetable_slots (
  id serial primary key,
  level text not null, day_of_week int not null, slot_order int not null,
  start_time text not null, end_time text not null,
  subject_id text not null, component_id text not null,
  subject_name text not null, component_name text not null,
  school_id uuid references public.schools(id),
  owner_teacher_id uuid references public.teachers(id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Du contenu CM1 plausible : 3 unités × 12 leçons.
-- ---------------------------------------------------------------------------
insert into public.lessons (subject_id, component_id, level, unit_number, week_number, theme, title)
select m.sid, m.cid, 'cm1', u, w,
       'Unité ' || u,
       initcap(m.sid) || ' — unité ' || u || ' semaine ' || w
from generate_series(1, 3) u,
     generate_series(1, 3) w,
     (values ('francais','grammaire'), ('maths','nombres-calculs'),
             ('sciences','sciences-vie'), ('english','reading')) as m(sid, cid);

-- Un peu de CM2, pour vérifier que les classes sans couverture restent vides.
insert into public.lessons (subject_id, component_id, level, unit_number, week_number, theme, title)
select 'maths','nombres-calculs','cm2', u, w, 'Unité ' || u, 'Maths CM2 U' || u || ' S' || w
from generate_series(1, 2) u, generate_series(1, 3) w;
