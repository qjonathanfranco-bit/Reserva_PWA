"""db.py — Acceso a datos de Volleybol mediante la API REST de Supabase (PostgREST).

No se usa psycopg: la clave publishable (`sb_publishable_...`) da acceso a
PostgREST. Configuración en el archivo .env:

  SUPABASE_URL=https://<ref>.supabase.co
  SUPABASE_KEY=sb_publishable_...

También se puede usar la clave `service_role` si se quiere saltarse RLS.
"""
import hashlib
import hmac
import json
import os
from pathlib import Path
from urllib import error, parse, request

from dotenv import load_dotenv

BASE = Path(__file__).resolve().parent
load_dotenv(BASE / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
REST = SUPABASE_URL + "/rest/v1"


# ---------- Cliente REST ----------
def configurado():
    return bool(SUPABASE_URL and SUPABASE_KEY)


def descripcion():
    return SUPABASE_URL.replace("https://", "").replace("http://", "") if configurado() else "SIN CONFIGURAR"


def es_supabase():
    return True


def _valor(v):
    if v is None:
        return "is.null"
    if isinstance(v, bool):
        return "true" if v else "false"
    return v


def api(path, method="GET", params=None, body=None, prefer=None):
    """Llama a PostgREST. Devuelve (status, datos)."""
    if not configurado():
        raise RuntimeError("Faltan SUPABASE_URL / SUPABASE_KEY en el archivo .env")
    url = REST + path
    if params:
        url += "?" + parse.urlencode({k: _valor(v) for k, v in params.items()}, doseq=True)
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(req, timeout=20) as r:
            crudo = r.read().decode("utf-8")
            return r.status, (json.loads(crudo) if crudo else None)
    except error.HTTPError as e:
        crudo = e.read().decode("utf-8")
        try:
            crudo = json.loads(crudo)
        except Exception:
            pass
        return e.code, crudo


def _select(tabla, columnas="*", **filtros):
    params = {"select": columnas}
    params.update(filtros)
    estado, datos = api("/" + tabla, params=params)
    if estado >= 400:
        raise RuntimeError(f"Supabase {tabla}: {estado} {datos}")
    return datos or []


def _insert(tabla, fila, devolver="id"):
    return api("/" + tabla, method="POST", body=fila, prefer="return=representation")


def _update(tabla, filtros, cambios):
    return api("/" + tabla, method="PATCH", params=filtros, body=cambios,
               prefer="return=representation")


# ---------- Utilidades de autenticación ----------
def hash_password(password):
    """Hash SHA-256 de una contraseña."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password, password_hash):
    """Verificación en tiempo constante."""
    return hmac.compare_digest(hash_password(password), str(password_hash))


# ---------- Selectores usados por la API y los scripts ----------
def get_sports():
    return _select("sports", "id,nombre,color,img", order="id")


def get_canchas():
    return _select("canchas", "id,nombre,sport_id,precio,detalle,estado,img")


def get_slots(sport_id=None):
    filtros = {"sport_id": "eq." + sport_id} if sport_id else {}
    return _select("slots", "sport_id,hora,disponible", order="sport_id,hora", **filtros)


def get_metadatos():
    return _select("metadatos", "key,valor")


def get_users():
    return _select("usuarios", "id,username,activo,creado_at")


def get_usuario(username):
    """Devuelve la fila completa de un usuario (incluye password_hash)."""
    rows = _select("usuarios", "id,username,password_hash,activo",
                   username="eq." + username, limit=1)
    return rows[0] if rows else None


def get_reservas(sport=None):
    """Reservas con el nombre de cancha y el nombre de usuario (JOIN PostgREST)."""
    columnas = ("id,cancha_id,usuario_id,fecha,hora_entrada,hora_salida,estado,"
                "canchas!inner(nombre,sport_id),usuarios(username)")
    filtros = {"canchas.sport_id": "eq." + sport} if sport else {}
    filtros["order"] = "id.desc"
    estado, datos = api("/reservas", params={"select": columnas, **filtros})
    if estado >= 400:
        raise RuntimeError(f"Supabase reservas: {estado} {datos}")
    resultado = []
    for r in datos or []:
        cancha = r.pop("canchas", {}) or {}
        usuario = r.pop("usuarios", {}) or {}
        if isinstance(cancha, list):
            cancha = cancha[0] if cancha else {}
        if isinstance(usuario, list):
            usuario = usuario[0] if usuario else {}
        fila = dict(r)
        fila["cancha_nombre"] = cancha.get("nombre", "")
        fila["sport_id"] = cancha.get("sport_id", "")
        fila["usuario"] = usuario.get("username")
        resultado.append(fila)
    return resultado


# ---------- Escrituras ----------
def insert_usuario(username, password_hash, activo=True):
    estado, datos = _insert("usuarios", {
        "username": username, "password_hash": password_hash, "activo": activo})
    return estado, datos


def insert_reserva(cancha_id, fecha, hora_entrada, hora_salida, estado="Activa", usuario_id=None):
    fila = {"cancha_id": cancha_id, "fecha": fecha,
            "hora_entrada": hora_entrada, "hora_salida": hora_salida, "estado": estado}
    if usuario_id is not None:
        fila["usuario_id"] = usuario_id
    estado, datos = _insert("reservas", fila)
    return estado, datos


def delete_reserva(reserva_id):
    estado, datos = api("/reservas", method="DELETE",
                        params={"id": "eq." + str(reserva_id)},
                        prefer="return=representation")
    return estado < 400 and bool(datos)


def insert_jugador(reserva_id, nombre, confirmado=False, pagado=False):
    return _insert("jugadores", {"reserva_id": reserva_id, "nombre": nombre,
                                 "confirmado": confirmado, "pagado": pagado})


def update_jugador(jugador_id, cambios):
    estado, datos = _update("jugadores", {"id": "eq." + str(jugador_id)}, cambios)
    return estado < 400 and bool(datos)


def update_precio(cancha_id, precio):
    estado, datos = _update("canchas", {"id": "eq." + str(cancha_id)}, {"precio": precio})
    return estado, datos


def update_slots_disponibles():
    """Normaliza datos antiguos: ningún slot queda marcado como ocupado fijo."""
    return _update("slots", {"disponible": "eq.false"}, {"disponible": True})
