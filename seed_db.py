"""seed_db.py — Crea los datos iniciales en Supabase (API REST, idempotente).

Antes de ejecutarlo hay que crear las tablas en Supabase:
  SQL Editor -> pega el contenido de supabase_schema.sql -> Run

Uso: python seed_db.py
"""
import sys

from db import api, descripcion, get_usuario, hash_password, insert_usuario, update_slots_disponibles


SPORTS = [
    {"id": "wally", "nombre": "WALLY ARENA", "color": "#38bdf8", "img": "img/vol/A.jpeg"},
    {"id": "futsal", "nombre": "FUTSAL PRO", "color": "#4ade80", "img": "img/vol/CANCHA.jpeg"},
    {"id": "voley", "nombre": "VÓLEY MASTER", "color": "#fbbf24", "img": "img/vol/CANCHA.jpeg"},
]

CANCHAS = [
    {"id": "A", "sport_id": "wally", "nombre": "CANCHA A", "precio": 40.00, "detalle": "Techada", "estado": True, "img": "img/vol/A.jpeg"},
    {"id": "B", "sport_id": "wally", "nombre": "CANCHA B", "precio": 45.00, "detalle": "Blindex", "estado": True, "img": "img/vol/B.jpeg"},
    {"id": "C", "sport_id": "wally", "nombre": "CANCHA C", "precio": 50.00, "detalle": "Pro", "estado": True, "img": "img/vol/C.jpeg"},
    {"id": "F", "sport_id": "futsal", "nombre": "ARENA FUTSAL SINTÉTICA", "precio": 120.00, "detalle": "Iluminación LED Pro", "estado": True, "img": "img/vol/CANCHA.jpeg"},
    {"id": "V", "sport_id": "voley", "nombre": "ARENA VÓLEY MASTER", "precio": 80.00, "detalle": "Red Ajustable Oficial", "estado": True, "img": "img/vol/CANCHA.jpeg"},
]

SLOTS = [
    {"sport_id": "wally", "hora": "14:00", "disponible": True},
    {"sport_id": "wally", "hora": "15:00", "disponible": True},
    {"sport_id": "wally", "hora": "16:00", "disponible": True},
    {"sport_id": "wally", "hora": "17:00", "disponible": True},
    {"sport_id": "wally", "hora": "18:00", "disponible": True},
    {"sport_id": "wally", "hora": "19:00", "disponible": True},
    {"sport_id": "futsal", "hora": "18:00", "disponible": True},
    {"sport_id": "futsal", "hora": "19:00", "disponible": True},
    {"sport_id": "futsal", "hora": "20:00", "disponible": True},
    {"sport_id": "futsal", "hora": "21:00", "disponible": True},
    {"sport_id": "voley", "hora": "15:00", "disponible": True},
    {"sport_id": "voley", "hora": "16:00", "disponible": True},
    {"sport_id": "voley", "hora": "17:00", "disponible": True},
    {"sport_id": "voley", "hora": "18:00", "disponible": True},
]

METADATOS = [
    {"key": "ano_inicio", "valor": "2026"},
    {"key": "ano_fin", "valor": "2027"},
    {"key": "app_nombre", "valor": "Volleybol"},
    {"key": "app_descripcion", "valor": "DeporZone - Arena Gaming Hub (Wally, Futsal, Vóley)"},
]


def upsert(tabla, filas):
    if not filas:
        return
    estado, datos = api("/" + tabla, method="POST", body=filas,
                        prefer="resolution=merge-duplicates,return=minimal")
    if estado >= 400:
        raise RuntimeError(f"No se pudo llenar {tabla}: {estado} {datos}")
    print(f"  {tabla}: {len(filas)} filas")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    print(f"Supabase: {descripcion()}")
    # Comprobación de que las tablas existen
    estado, datos = api("/sports", params={"select": "id", "limit": 1})
    if estado == 404:
        print("✘ Las tablas no existen. Abre Supabase -> SQL Editor, pega el contenido")
        print("  de supabase_schema.sql y pulsa Run. Luego vuelve a ejecutar este script.")
        return 1
    if estado >= 400:
        print(f"✘ Error al conectar: {estado} {datos}")
        return 1

    upsert("sports", SPORTS)
    upsert("canchas", CANCHAS)
    upsert("slots", SLOTS)
    upsert("metadatos", METADATOS)
    update_slots_disponibles()

    if not get_usuario("admin"):
        cod, _ = insert_usuario("admin", hash_password("volleybol"))
        if cod < 400:
            print("  usuario admin creado (contraseña: volleybol)")
    else:
        print("  usuario admin ya existe")

    print("¡Datos iniciales listos en Supabase!")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
