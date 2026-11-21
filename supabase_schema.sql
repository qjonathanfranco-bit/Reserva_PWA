-- ============================================================
-- Volleybol / DeporZone — schema para Supabase
-- Copia TODO este contenido en Supabase -> SQL Editor -> Run
-- ============================================================

create table if not exists sports (
    id     varchar(20) primary key,
    nombre varchar(50) not null,
    color  varchar(9),
    img    varchar(120)
);

create table if not exists canchas (
    id       varchar(10) primary key,
    sport_id varchar(20) not null references sports(id),
    nombre   varchar(50) not null,
    precio   numeric(10,2) not null default 0,
    detalle  varchar(50) not null default '',
    estado   boolean not null default true,
    img      varchar(120),
    unique (sport_id, id)
);

create table if not exists slots (
    id          serial primary key,
    sport_id    varchar(20) not null references sports(id),
    hora        varchar(5) not null,
    disponible  boolean not null default true,
    unique (sport_id, hora)
);

create table if not exists usuarios (
    id            serial primary key,
    username      varchar(50) unique not null,
    password_hash varchar(64) not null,
    activo        boolean not null default true,
    creado_at     timestamp not null default now()
);

create table if not exists reservas (
    id            serial primary key,
    cancha_id     varchar(10) not null references canchas(id),
    usuario_id    integer references usuarios(id),
    fecha         date not null,
    hora_entrada  varchar(5) not null,
    hora_salida   varchar(5) not null,
    estado        varchar(20) not null default 'Activa',
    creado_at     timestamp not null default now()
);

create table if not exists jugadores (
    id          serial primary key,
    reserva_id  integer not null references reservas(id),
    nombre      varchar(50) not null,
    confirmado  boolean not null default false,
    pagado      boolean not null default false
);

create table if not exists metadatos (
    key   varchar(50) primary key,
    valor varchar(100) not null
);

-- ============================================================
-- Acceso con la clave publishable (rol anon).
-- Si prefieres cerrar la app, cambia estas políticas.
-- ============================================================
alter table sports     enable row level security;
alter table canchas    enable row level security;
alter table slots      enable row level security;
alter table usuarios   enable row level security;
alter table reservas   enable row level security;
alter table jugadores  enable row level security;
alter table metadatos  enable row level security;

drop policy if exists "volleybol_anon_all" on sports;
create policy "volleybol_anon_all" on sports for all to anon using (true) with check (true);

drop policy if exists "volleybol_anon_all" on canchas;
create policy "volleybol_anon_all" on canchas for all to anon using (true) with check (true);

drop policy if exists "volleybol_anon_all" on slots;
create policy "volleybol_anon_all" on slots for all to anon using (true) with check (true);

drop policy if exists "volleybol_anon_all" on usuarios;
create policy "volleybol_anon_all" on usuarios for all to anon using (true) with check (true);

drop policy if exists "volleybol_anon_all" on reservas;
create policy "volleybol_anon_all" on reservas for all to anon using (true) with check (true);

drop policy if exists "volleybol_anon_all" on jugadores;
create policy "volleybol_anon_all" on jugadores for all to anon using (true) with check (true);

drop policy if exists "volleybol_anon_all" on metadatos;
create policy "volleybol_anon_all" on metadatos for all to anon using (true) with check (true);

grant all on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon;
alter default privileges in schema public grant usage, select on sequences to anon;
