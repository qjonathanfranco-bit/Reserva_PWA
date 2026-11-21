"""backend.py — Servidor HTTP de Volleybol: API conectada a PostgreSQL + página estática.

Endpoints:
  GET    /api/canchas                 -> canchas (id, nombre, sport_id, precio, estado, img)
  PATCH  /api/canchas/<id>            -> cambiar precio por hora de una cancha (JSON: precio)
  GET    /api/slots                   -> slots (sport_id, hora, disponible)
  GET    /api/metadatos               -> metadatos (validación 2026/2027, app_nombre, ...)
  GET    /api/reservas?sport=X        -> reservas del deporte (id, cancha_nombre, fecha, hora_entrada, hora_salida, estado)
  POST   /api/reservas                -> crear reserva (JSON: cancha, fecha, hora_entrada, hora_salida, estado?, usuario_id?)
  DELETE /api/reservas/<id>           -> borrar reserva
  POST   /api/reservas/<id>/jugadores -> crear jugador de una reserva (nombre, confirmado, pagado)
  PATCH  /api/jugadores/<id>          -> actualizar confirmado/pagado
  POST   /api/login                   -> login (username + password)

Página estática: http://127.0.0.1:5000/

Ejecutar:  python backend.py
"""
import os

from flask import Flask, jsonify, request, send_from_directory

from db import connect, descripcion, hash_password, verify_password
from login import login

print(f"[Volleybol] Base de datos: {descripcion()}")

BASE = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__)


# ---------- CORS ----------
# Permite que la API sea llamada aunque la página se abra desde otro servidor
# (p. ej. `python -m http.server 8123`) o desde un archivo local. Sin estas
# cabeceras el navegador bloquea las peticiones y aparece "No se pudo conectar".
@app.after_request
def _cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, PATCH, OPTIONS"
    return resp


# ---------- API: datos de la base de datos ----------

@app.get("/api/canchas")
def api_canchas():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, nombre, sport_id, precio, detalle, estado, img FROM canchas ORDER BY sport_id, id")
        return jsonify(cur.fetchall())


@app.patch("/api/canchas/<cancha_id>")
def api_actualizar_precio(cancha_id):
    """Actualiza el precio por hora de una cancha."""
    data = request.get_json(force=True) or {}
    try:
        precio = float(data.get("precio"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "msg": "Precio no válido"}), 400
    if precio < 0:
        return jsonify({"ok": False, "msg": "El precio no puede ser negativo"}), 400
    with connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE canchas SET precio = %s WHERE id = %s", (precio, cancha_id))
        n = cur.rowcount
    if not n:
        return jsonify({"ok": False, "msg": "Cancha no encontrada"}), 404
    return jsonify({"ok": True, "msg": "✔ Precio actualizado"})


@app.get("/api/slots")
def api_slots():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT sport_id, hora, disponible FROM slots ORDER BY sport_id, hora")
        return jsonify(cur.fetchall())


@app.get("/api/metadatos")
def api_metadatos():
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT key, valor FROM metadatos")
        return jsonify({r["key"]: r["valor"] for r in cur.fetchall()})


@app.get("/api/reservas")
def api_reservas():
    sport = request.args.get("sport", "")
    with connect() as conn, conn.cursor() as cur:
        if sport:
            cur.execute("""
                SELECT r.id, c.nombre AS cancha_nombre, c.sport_id, r.fecha,
                       r.hora_entrada, r.hora_salida, r.estado
                FROM reservas r JOIN canchas c ON c.id = r.cancha_id
                WHERE c.sport_id = %s ORDER BY r.id DESC
            """, (sport,))
        else:
            cur.execute("""
                SELECT r.id, c.nombre AS cancha_nombre, c.sport_id, r.fecha,
                       r.hora_entrada, r.hora_salida, r.estado
                FROM reservas r JOIN canchas c ON c.id = r.cancha_id
                ORDER BY r.id DESC
            """)
        rows = cur.fetchall()
    for r in rows:
        if r.get("fecha"):
            r["fecha"] = r["fecha"].isoformat()  # formato ISO: "2026-11-22"
    return jsonify(rows)


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
    with connect() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO reservas (cancha_id, usuario_id, fecha, hora_entrada, hora_salida, estado)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        """, (cancha_id, usuario_id, fecha, entrada, salida or entrada, estado))
        nuevo_id = cur.fetchone()["id"]
    return jsonify({"ok": True, "id": nuevo_id, "msg": "✔ Reserva creada en la base de datos."})


@app.delete("/api/reservas/<int:id>")
def api_borrar_reserva(id):
    with connect() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM reservas WHERE id = %s", (id,))
        borrado = cur.rowcount > 0
    return jsonify({"ok": borrado})


@app.post("/api/reservas/<int:id>/jugadores")
def api_crear_jugador(id):
    data = request.get_json(force=True) or {}
    nombre = (data.get("nombre") or "").strip()
    confirmado = bool(data.get("confirmado", False))
    pagado = bool(data.get("pagado", False))
    if not nombre:
        return jsonify({"ok": False, "msg": "El nombre del jugador es obligatorio"}), 400
    with connect() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO jugadores (reserva_id, nombre, confirmado, pagado)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (id, nombre, confirmado, pagado))
        nuevo_id = cur.fetchone()["id"]
    return jsonify({"ok": True, "id": nuevo_id})


@app.patch("/api/jugadores/<int:id>")
def api_actualizar_jugador(id):
    data = request.get_json(force=True) or {}
    sets, params = [], []
    if "confirmado" in data:
        sets.append("confirmado = %s")
        params.append(bool(data["confirmado"]))
    if "pagado" in data:
        sets.append("pagado = %s")
        params.append(bool(data["pagado"]))
    params.append(id)
    if not sets:
        return jsonify({"ok": True, "msg": "Sin cambios"})
    with connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE jugadores SET " + ", ".join(sets) + " WHERE id = %s", params)
        n = cur.rowcount
    return jsonify({"ok": n > 0})


@app.post("/api/login")
def api_login():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return jsonify({"ok": False, "msg": "Ingresa usuario y contraseña"}), 400
    if not login(username, password):
        return jsonify({"ok": False, "msg": "Credenciales inválidas"}), 401
    with connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, username FROM usuarios WHERE username = %s", (username,))
        row = cur.fetchone()
    return jsonify({"ok": True,
                    "msg": "✔ ¡Bienvenido, " + row["username"] + "!",
                    "usuario": row["username"], "usuario_id": row["id"]})


@app.post("/api/registrar")
def api_registrar():
    """Crea un nuevo usuario en la base de datos (usuario + contraseña)."""
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    confirm = data.get("confirm") or password
    if not username or not password:
        return jsonify({"ok": False, "msg": "Ingresa usuario y contraseña"}), 400
    if password != confirm:
        return jsonify({"ok": False, "msg": "La confirmación no coincide"}), 400
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO usuarios (username, password_hash, activo) VALUES (%s, %s, true) ON CONFLICT (username) DO NOTHING",
            (username, hash_password(password)),
        )
        n = cur.rowcount
    if not n:
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
