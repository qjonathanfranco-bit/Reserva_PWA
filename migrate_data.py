"""migrate_data.py — Exporta/importa los datos entre la BD local y Supabase.

Uso:
  python migrate_data.py export   -> guarda volleybol_backup.json desde la BD configurada
  python migrate_data.py import   -> vuelca ese backup en la BD configurada (Supabase)

El backup se hace con la BD local ANTES de poner DATABASE_URL en .env, y la
importación se hace DESPUÉS de ejecutar seed_db.py en Supabase.
"""
import json
import sys
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

from db import connect, descripcion

BACKUP = Path(__file__).with_name("volleybol_backup.json")

TABLAS = ["sports", "canchas", "slots", "usuarios", "metadatos", "reservas", "jugadores"]
COLUMNAS = {
    "sports":    ["id", "nombre", "color", "img"],
    "canchas":   ["id", "sport_id", "nombre", "precio", "detalle", "estado", "img"],
    "slots":     ["sport_id", "hora", "disponible"],
    "usuarios":  ["id", "username", "password_hash", "activo", "creado_at"],
    "metadatos": ["key", "valor"],
    "reservas":  ["id", "cancha_id", "usuario_id", "fecha", "hora_entrada", "hora_salida", "estado", "creado_at"],
    "jugadores": ["id", "reserva_id", "nombre", "confirmado", "pagado"],
}
CONFLICTO = {
    "sports": "id", "canchas": "id", "slots": "(sport_id, hora)",
    "usuarios": "id", "metadatos": "key", "reservas": "id", "jugadores": "id",
}
SECUENCIAS = [("slots", "id"), ("usuarios", "id"), ("reservas", "id"), ("jugadores", "id")]


def serializar(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return str(v)
    return v


def exportar():
    datos = {}
    with connect() as conn, conn.cursor() as cur:
        for tabla in TABLAS:
            cols = ", ".join(COLUMNAS[tabla])
            cur.execute(f"SELECT {cols} FROM {tabla}")
            datos[tabla] = [{k: serializar(v) for k, v in fila.items()} for fila in cur.fetchall()]
    BACKUP.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✔ Backup guardado en {BACKUP.name} desde {descripcion()}")
    print("Filas:", {t: len(v) for t, v in datos.items()})


def importar():
    if not BACKUP.exists():
        raise SystemExit(f"✘ No existe {BACKUP.name}. Ejecuta primero: python migrate_data.py export")
    datos = json.loads(BACKUP.read_text(encoding="utf-8"))
    with connect() as conn, conn.cursor() as cur:
        for tabla in TABLAS:
            cols = COLUMNAS[tabla]
            actualizaciones = ", ".join(f"{c}=EXCLUDED.{c}" for c in cols if c != "id")
            sql = (
                f"INSERT INTO {tabla} ({', '.join(cols)}) "
                f"VALUES ({', '.join(['%s'] * len(cols))}) "
                f"ON CONFLICT {CONFLICTO[tabla]} DO UPDATE SET {actualizaciones}"
            )
            for fila in datos.get(tabla, []):
                cur.execute(sql, [fila.get(c) for c in cols])
            print(f"  {tabla}: {len(datos.get(tabla, []))} filas")
        # Dejar los contadores de IDs donde estaban
        for tabla, col in SECUENCIAS:
            cur.execute("SELECT pg_get_serial_sequence(%s, %s) AS seq", (tabla, col))
            seq = cur.fetchone()["seq"]
            if seq:
                cur.execute(
                    f"SELECT setval(%s, GREATEST(COALESCE(MAX({col}), 0), 1), true) FROM {tabla}",
                    (seq,),
                )
    print(f"✔ Datos importados en {descripcion()}")


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else ""
    if modo == "export":
        exportar()
    elif modo == "import":
        importar()
    else:
        raise SystemExit("Uso: python migrate_data.py export | import")
