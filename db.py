"""db.py — Conexión a PostgreSQL (Supabase o local) para Volleybol / DeporZone.

Configuración por variables de entorno o archivo .env (se carga automáticamente):

  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres

También se aceptan variables individuales:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSLMODE

Si no hay nada configurado se mantiene el PostgreSQL local (127.0.0.1:5432,
base 'volleybol', modo trust) para no romper el entorno anterior.
"""
import hashlib
import hmac
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")  # las variables del entorno real tienen prioridad

# --- Configuración de la conexión ---
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
HOST = os.getenv("DB_HOST", "127.0.0.1")
PORT = int(os.getenv("DB_PORT", "5432"))
DATABASE = os.getenv("DB_NAME", "volleybol")
USER = os.getenv("DB_USER", "postgres")
PASSWORD = os.getenv("DB_PASSWORD") or None
SSLMODE = os.getenv("DB_SSLMODE", "").strip()


def es_supabase():
    """True si la configuración apunta a Supabase."""
    return "supabase" in (DATABASE_URL or HOST).lower()


def descripcion():
    """Texto corto para mostrar por consola al arrancar el backend."""
    if DATABASE_URL:
        # Ocultar la contraseña del connection string
        seguro = DATABASE_URL
        if "@" in seguro and "://" in seguro:
            esquema, resto = seguro.split("://", 1)
            usuario, servidor = resto.split("@", 1)
            usuario = usuario.split(":", 1)[0]
            seguro = esquema + "://" + usuario + ":***@" + servidor
        return seguro
    return f"{USER}@{HOST}:{PORT}/{DATABASE}"


def connect():
    """Abre una conexión (cursor con diccionarios). Usa Supabase si está configurado."""
    if DATABASE_URL:
        conninfo = DATABASE_URL
        # Supabase exige TLS. Si el string no lo trae, lo añadimos.
        if "sslmode=" not in conninfo.lower() and "supabase" in conninfo.lower():
            conninfo += ("&" if "?" in conninfo else "?") + "sslmode=require"
        return psycopg.connect(conninfo, row_factory=psycopg.rows.dict_row)

    kwargs = dict(
        host=HOST,
        port=PORT,
        dbname=DATABASE,
        user=USER,
        password=PASSWORD,
        row_factory=psycopg.rows.dict_row,
    )
    if SSLMODE:
        kwargs["sslmode"] = SSLMODE
    elif "supabase" in HOST.lower():
        kwargs["sslmode"] = "require"
    return psycopg.connect(**kwargs)


# --- Utilidades de autenticación (usadas por add_user.py y login.py) ---
def hash_password(password):
    """Hash SHA-256 de una contraseña (para guardar en usuarios.password_hash)."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password, password_hash):
    """Verifica una contraseña contra su hash (comparación constante)."""
    return hmac.compare_digest(hash_password(password), password_hash)


# --- Selectores de datos (para reportes y futura API) ---
def get_sports():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, nombre, color, img FROM sports ORDER BY id")
        return cur.fetchall()


def get_canchas():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT c.id, c.nombre, c.sport_id, c.precio, c.detalle, c.estado, c.img
            FROM canchas c ORDER BY c.sport_id, c.id
        """)
        return cur.fetchall()


def get_slots(sport_id=None):
    with connect() as conn, conn.cursor() as cur:
        if sport_id:
            cur.execute("SELECT sport_id, hora, disponible FROM slots WHERE sport_id = %s ORDER BY hora", (sport_id,))
        else:
            cur.execute("SELECT sport_id, hora, disponible FROM slots ORDER BY sport_id, hora")
        return cur.fetchall()


def get_metadatos():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT key, valor FROM metadatos ORDER BY key")
        return cur.fetchall()


def get_users():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, username, activo, creado_at FROM usuarios ORDER BY id")
        return cur.fetchall()


def get_reservas():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT r.id, c.nombre as cancha, r.fecha, r.hora_entrada, r.hora_salida,
                   r.estado, u.username as usuario, r.creado_at
            FROM reservas r
            JOIN canchas c ON c.id = r.cancha_id
            LEFT JOIN usuarios u ON u.id = r.usuario_id
            ORDER BY r.fecha DESC, r.id
        """)
        return cur.fetchall()
