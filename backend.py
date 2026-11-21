"""backend.py — Servidor HTTP de Volleybol: API conectada a Supabase + página estática.

Endpoints:
  GET    /api/canchas                 -> canchas
  PATCH  /api/canchas/<id>            -> cambiar precio por hora (JSON: precio)
  GET    /api/slots                   -> horarios
  GET    /api/metadatos               -> metadatos
  GET    /api/reservas?sport=X        -> reservas del deporte
  POST   /api/reservas                -> crear reserva
  DELETE /api/reservas/<id>           -> borrar reserva
  POST   /api/reservas/<id>/jugadores -> crear jugador
  PATCH  /api/jugadores/<id>          -> actualizar confirmado/pagado
  POST   /api/login                   -> login
  POST   /api/registrar               -> crear usuario

Página estática: http://127.0.0.1:5000/
Ejecutar: python backend.py
"""
import os

from flask import Flask, jsonify, request, send_from_directory

import db
from login import login

print(f"[Volleybol] Supabase: {db.descripcion()}")

BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)


# ---------- CORS ----------
@app.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, PATCH, OPTIONS"
    return resp


def error_supabase(exc):
    return jsonify({"ok": False, "msg": "Error al consultar Supabase: " + str(exc)}), 502


# ---------- API ----------

@app.get("/api/canchas")
def api_canchas():
    try:
        return jsonify(db.get_canchas())
    except Exception as exc:
        return error_supabase(exc)


@app.patch("/api/canchas/<cancha_id>")
def api_actualizar_precio(cancha_id):
    data = request.get_json(force=True) or {}
    try:
        precio = float(data.get("precio"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "msg": "Precio no válido"}), 400
    if precio < 0:
        return jsonify({"ok": False, "msg": "El precio no puede ser negativo"}), 400
    try:
        estado, filas = db.update_precio(cancha_id, precio)
    except Exception as exc:
        return error_supabase(exc)
    if estado >= 400 or not filas:
        return jsonify({"ok": False, "msg": "Cancha no encontrada"}), 404
    return jsonify({"ok": True, "msg": "✔ Precio actualizado"})


@app.get("/api/slots")
def api_slots():
    try:
        return jsonify(db.get_slots())
    except Exception as exc:
        return error_supabase(exc)


@app.get("/api/metadatos")
def api_metadatos():
    try:
        filas = db.get_metadatos()
        return jsonify({r["key"]: r["valor"] for r in filas})
    except Exception as exc:
        return error_supabase(exc)


@app.get("/api/reservas")
def api_reservas():
    sport = request.args.get("sport", "")
    try:
        filas = db.get_reservas(sport or None)
    except Exception as exc:
        return error_supabase(exc)
    for r in filas:
        if r.get("fecha"):
            r["fecha"] = str(r["fecha"])[:10]
    return jsonify(filas)


@app.post("/api/reservas")
def api_crear_reserva():
    data = request.get_json(force=True) or {}
    cancha_id = (data.get("cancha") or "").strip()
    fecha = (data.get("fecha") or "").strip()
    entrada = (data.get("hora_entrada") or "").strip()
    salida = (data.get("hora_salida") or "").strip()
    estado = (data.get("estado") or "Activa").strip()
    usuario_id = data.get("usuario_id")
    if not cancha_id or not fecha or not entrada:
        return jsonify({"ok": False, "msg": "Faltan datos de la reserva (cancha, fecha, hora de entrada)"}), 400
    try:
        cod, filas = db.insert_reserva(cancha_id, fecha, entrada, salida or entrada,
                                       estado, usuario_id)
    except Exception as exc:
        return error_supabase(exc)
    if cod >= 400:
        return jsonify({"ok": False, "msg": "No se pudo crear la reserva: " + str(filas)}), 400
    nuevo_id = (filas or [{}])[0].get("id")
    return jsonify({"ok": True, "id": nuevo_id, "msg": "✔ Reserva creada en Supabase."})


@app.delete("/api/reservas/<int:id>")
def api_borrar_reserva(id):
    try:
        borrado = db.delete_reserva(id)
    except Exception as exc:
        return error_supabase(exc)
    return jsonify({"ok": borrado})


@app.post("/api/reservas/<int:id>/jugadores")
def api_crear_jugador(id):
    data = request.get_json(force=True) or {}
    nombre = (data.get("nombre") or "").strip()
    if not nombre:
        return jsonify({"ok": False, "msg": "El nombre del jugador es obligatorio"}), 400
    try:
        cod, filas = db.insert_jugador(id, nombre,
                                       bool(data.get("confirmado", False)),
                                       bool(data.get("pagado", False)))
    except Exception as exc:
        return error_supabase(exc)
    if cod >= 400:
        return jsonify({"ok": False, "msg": "No se pudo crear el jugador"}), 400
    return jsonify({"ok": True, "id": (filas or [{}])[0].get("id")})


@app.patch("/api/jugadores/<int:id>")
def api_actualizar_jugador(id):
    data = request.get_json(force=True) or {}
    cambios = {}
    if "confirmado" in data:
        cambios["confirmado"] = bool(data["confirmado"])
    if "pagado" in data:
        cambios["pagado"] = bool(data["pagado"])
    if not cambios:
        return jsonify({"ok": True, "msg": "Sin cambios"})
    try:
        ok = db.update_jugador(id, cambios)
    except Exception as exc:
        return error_supabase(exc)
    return jsonify({"ok": ok})


@app.post("/api/login")
def api_login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"ok": False, "msg": "Ingresa usuario y contraseña"}), 400
    try:
        if not login(username, password):
            return jsonify({"ok": False, "msg": "Credenciales inválidas"}), 401
        fila = db.get_usuario(username)
    except Exception as exc:
        return error_supabase(exc)
    return jsonify({"ok": True,
                    "msg": "✔ ¡Bienvenido, " + fila["username"] + "!",
                    "usuario": fila["username"], "usuario_id": fila["id"]})


@app.post("/api/registrar")
def api_registrar():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    confirm = data.get("confirm") or password
    if not username or not password:
        return jsonify({"ok": False, "msg": "Ingresa usuario y contraseña"}), 400
    if password != confirm:
        return jsonify({"ok": False, "msg": "La confirmación no coincide"}), 400
    if db.get_usuario(username):
        return jsonify({"ok": False, "msg": "El usuario ya existe"}), 409
    try:
        cod, _ = db.insert_usuario(username, db.hash_password(password))
    except Exception as exc:
        return error_supabase(exc)
    if cod >= 400:
        return jsonify({"ok": False, "msg": "El usuario ya existe"}), 409
    return jsonify({"ok": True, "msg": "✔ Usuario '" + username + "' creado. Inicia sesión con él."})


# ---------- Página estática ----------

@app.route("/")
def index():
    return send_from_directory(BASE, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(BASE, filename)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
