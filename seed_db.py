"""seed_db.py — Crea el schema y los datos iniciales en la BD configurada (Supabase o local).

Todo lo que tenía hardcodeado en el proyecto ahora vive en la base de datos:
deportes, canchas, precios, horarios, validación de fechas (2026-2027) y el
usuario admin por defecto. Ejecutar: python seed_db.py
"""
from db import connect, descripcion, es_supabase, hash_password

SCHEMA = """
-- Sports: las llaves usadas en la página (wally, futsal, voley)
CREATE TABLE IF NOT EXISTS sports (
    id     varchar(20) PRIMARY KEY,
    nombre varchar(50) NOT NULL,
    color  varchar(9),
    img    varchar(120)
);

-- Canchas: A/B/C de wally, CANCHA de futsal, ARENA VÓLEY MASTER
CREATE TABLE IF NOT EXISTS canchas (
    id       varchar(10) PRIMARY KEY,
    sport_id varchar(20) NOT NULL REFERENCES sports(id),
    nombre   varchar(50) NOT NULL,
    precio   numeric(10,2) NOT NULL DEFAULT 0,
    detalle  varchar(50) NOT NULL DEFAULT '',
    estado   boolean NOT NULL DEFAULT true,
    img      varchar(120),
    UNIQUE (sport_id, id)
);

-- Slots disponibles por deporte (horarios de la página)
CREATE TABLE IF NOT EXISTS slots (
    id          serial PRIMARY KEY,
    sport_id    varchar(20) NOT NULL REFERENCES sports(id),
    hora        varchar(5) NOT NULL,
    disponible  boolean NOT NULL DEFAULT true,
    UNIQUE (sport_id, hora)
);

-- Usuarios para el mini login
CREATE TABLE IF NOT EXISTS usuarios (
    id           serial PRIMARY KEY,
    username     varchar(50) UNIQUE NOT NULL,
    password_hash varchar(64) NOT NULL,
    activo       boolean NOT NULL DEFAULT true,
    creado_at    timestamp NOT NULL DEFAULT now()
);

-- Reservas (estado: Activa / Terminada / ...)
-- usuario_id opcional (NULL si no se ha iniciado sesión)
CREATE TABLE IF NOT EXISTS reservas (
    id           serial PRIMARY KEY,
    cancha_id    varchar(10) NOT NULL REFERENCES canchas(id),
    usuario_id   integer REFERENCES usuarios(id),
    fecha        date NOT NULL,
    hora_entrada varchar(5) NOT NULL,
    hora_salida  varchar(5) NOT NULL,
    estado       varchar(20) NOT NULL DEFAULT 'Activa',
    creado_at    timestamp NOT NULL DEFAULT now()
);

-- Jugadores de una reserva (confirmado / pagado)
CREATE TABLE IF NOT EXISTS jugadores (
    id         serial PRIMARY KEY,
    reserva_id integer NOT NULL REFERENCES reservas(id),
    nombre     varchar(50) NOT NULL,
    confirmado boolean NOT NULL DEFAULT false,
    pagado     boolean NOT NULL DEFAULT false
);

-- Metadatos de la página: validación de fechas (2026-2027)
CREATE TABLE IF NOT EXISTS metadatos (
    key   varchar(50) PRIMARY KEY,
    valor varchar(100) NOT NULL
);
"""

SPORTS = [
    # id,     nombre,               color,     img
    ("wally",  "WALLY ARENA",         "#38bdf8", "img/vol/A.jpeg"),
    ("futsal", "FUTSAL PRO",          "#4ade80", "img/vol/CANCHA.jpeg"),
    ("voley",  "VÓLEY MASTER",        "#fbbf24", "img/vol/CANCHA.jpeg"),
]

CANCHAS = [
    # id, sport_id,  nombre,                  precio, detalle,                 estado, img
    ("A",  "wally",  "CANCHA A",              40.00,  "Techada",              True,   "img/vol/A.jpeg"),
    ("B",  "wally",  "CANCHA B",              45.00,  "Blindex",              True,   "img/vol/B.jpeg"),
    ("C",  "wally",  "CANCHA C",              50.00,  "Pro",                  True,   "img/vol/C.jpeg"),
    ("F",  "futsal", "ARENA FUTSAL SINTÉTICA", 120.00, "Iluminación LED Pro",  True,   "img/vol/CANCHA.jpeg"),
    ("V",  "voley",  "ARENA VÓLEY MASTER",    80.00,  "Red Ajustable Oficial", True,  "img/vol/CANCHA.jpeg"),
]

SLOTS = [
    # sport_id, hora,   disponible
    # Todos los horarios son reservables: un slot se muestra ocupado solo cuando
    # existe una reserva real en esa fecha/hora (lo calcula la app desde /api/reservas).
    ("wally",  "14:00", True), ("wally",  "15:00", True), ("wally",  "16:00", True),
    ("wally",  "17:00", True),
    ("wally",  "18:00", True), ("wally",  "19:00", True),
    ("futsal", "18:00", True), ("futsal", "19:00", True),
    ("futsal", "20:00", True),
    ("futsal", "21:00", True),
    ("voley",  "15:00", True), ("voley",  "16:00", True),
    ("voley",  "17:00", True), ("voley",  "18:00", True),
]

METADATOS = [
    ("ano_inicio", "2026"),   # validación: solo fechas a partir de 2026
    ("ano_fin",    "2027"),   # validación: solo fechas hasta 2027
    ("app_nombre", "Volleybol"),
    ("app_descripcion", "DeporZone - Arena Gaming Hub (Wally, Futsal, Vóley)"),
]

# Usuario admin por defecto: usuario=admin, contraseña=volleybol
DEFAULT_USER = ("admin", hash_password("volleybol"))


def ensure_database():
    """Comprueba la conexión. En Supabase no se pueden crear bases de datos:
    las tablas viven en el schema 'public' de la BD indicada en DATABASE_URL."""
    if es_supabase():
        print("Usando Supabase. No se crea la BD (usa el schema 'public').")
    try:
        with connect() as conn, conn.cursor() as cur:
            cur.execute("SELECT current_database() AS db, current_user AS usuario")
            info = cur.fetchone()
        print(f"Conectado a {descripcion()} (BD: {info['db']}, usuario: {info['usuario']}).")
    except Exception as exc:
        raise SystemExit(f"✘ No se pudo conectar a la base de datos: {exc}") from exc


def seed():
    """Crea schema + datos (idempotente)."""
    from db import connect

    with connect() as conn, conn.cursor() as cur:
        cur.execute(SCHEMA)
        cur.execute("ALTER TABLE reservas ALTER COLUMN usuario_id DROP NOT NULL")
        cur.execute("ALTER TABLE canchas ADD COLUMN IF NOT EXISTS detalle varchar(50) NOT NULL DEFAULT ''")
        print("Schema creado/verificado (tablas IF NOT EXISTS).")

        cur.executemany("INSERT INTO sports (id, nombre, color, img) VALUES (%s, %s, %s, %s) ON CONFLICT (id) DO NOTHING", SPORTS)
        print("Deportes:", len(SPORTS), "filas.")

        cur.executemany(
            "INSERT INTO canchas (id, sport_id, nombre, precio, detalle, estado, img) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (sport_id, id) DO NOTHING",
            CANCHAS,
        )
        # rellenamos detalles en filas ya existentes (solo donde esté vacío)
        cur.executemany(
            "UPDATE canchas SET detalle = %s WHERE id = %s AND detalle = ''",
            [(d, i) for (i, _, _, _, d, _, _) in CANCHAS],
        )
        print("Canchas:", len(CANCHAS), "filas.")

        cur.executemany(
            "INSERT INTO slots (sport_id, hora, disponible) VALUES (%s, %s, %s) ON CONFLICT (sport_id, hora) DO NOTHING",
            SLOTS,
        )
        # Normalizar datos antiguos: ningún horario queda marcado como ocupado fijo
        cur.execute("UPDATE slots SET disponible = true WHERE disponible = false")
        print("Slots:", len(SLOTS), "filas (todos reservables).")

        cur.executemany(
            "INSERT INTO metadatos (key, valor) VALUES (%s, %s) ON CONFLICT (key) DO NOTHING",
            METADATOS,
        )
        print("Metadatos:", len(METADATOS), "filas.")

        cur.execute(
            "INSERT INTO usuarios (username, password_hash, activo) VALUES (%s, %s, true) "
            "ON CONFLICT (username) DO NOTHING",
            DEFAULT_USER,
        )
        print("Usuario por defecto: admin (con contraseña 'volleybol').")

    print("¡Base de datos Volleybol lista!")


def main():
    ensure_database()
    seed()


if __name__ == "__main__":
    main()
