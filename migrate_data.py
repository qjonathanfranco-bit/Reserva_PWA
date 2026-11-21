"""migrate_data.py — Importa el backup local a Supabase (API REST).

El backup volleybol_backup.json ya fue generado desde el PostgreSQL local.
Uso: python migrate_data.py import
"""
import json
import sys
from pathlib import Path

from db import api, descripcion

BACKUP = Path(__file__).with_name("volleybol_backup.json")


def enviar(tabla, filas, prefer):
    if not filas:
        print(f"  {tabla}: 0 filas")
        return
    estado, respuesta = api("/" + tabla, method="POST", body=filas, prefer=prefer)
    if estado >= 400:
        raise SystemExit(f"✘ Error importando {tabla}: {estado} {respuesta}")
    print(f"  {tabla}: {len(filas)} filas")


def sin_id(filas):
    """Quita el id para que Supabase asigne el siguiente valor de la secuencia."""
    return [{k: v for k, v in fila.items() if k != "id"} for fila in filas]


def importar():
    if not BACKUP.exists():
        raise SystemExit(f"✘ No existe {BACKUP.name}")
    datos = json.loads(BACKUP.read_text(encoding="utf-8"))
    print(f"Importando a {descripcion()}...")

    # Estos ya los crea seed_db.py con los mismos valores
    enviar("sports", datos.get("sports", []), "resolution=merge-duplicates,return=minimal")
    enviar("canchas", datos.get("canchas", []), "resolution=merge-duplicates,return=minimal")
    enviar("metadatos", datos.get("metadatos", []), "resolution=merge-duplicates,return=minimal")
    print("  slots: ya creados por seed_db.py (se omiten)")

    # Usuarios: el admin ya existe; los demás se insertan sin id para no
    # desfasar la secuencia y se ignoran duplicados por username.
    usuarios = [f for f in datos.get("usuarios", []) if f.get("username") != "admin"]
    enviar("usuarios", sin_id(usuarios), "resolution=ignore-duplicates,return=minimal")

    # Reservas y jugadores: sin id, deja que Supabase genere el siguiente.
    enviar("reservas", sin_id(datos.get("reservas", [])), "return=minimal")
    enviar("jugadores", sin_id(datos.get("jugadores", [])), "return=minimal")

    print("✔ Datos importados a Supabase.")


if __name__ == "__main__":
    modo = sys.argv[1] if len(sys.argv) > 1 else "import"
    if modo == "import":
        importar()
    else:
        raise SystemExit("Uso: python migrate_data.py import")
