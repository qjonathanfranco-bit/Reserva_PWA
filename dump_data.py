"""dump_data.py — Muestra todos los datos de la página Volleybol desde PostgreSQL (DB :volleybol:).

Sirve para verificar qué hay en la base de datos y confirmar que el "lo que tenía la
página hardcodeado" está ahora en la DB.
"""
from db import connect, get_sports, get_canchas, get_slots, get_metadatos, get_users


def main():
    print("=== Sports ===")
    for s in get_sports():
        print(f"  {s['id']:>8}  {s['nombre']:<20} color={s['color']}  img={s['img']}")

    print("\n=== Canchas ===")
    for c in get_canchas():
        print(f"  {c['id']:>2}  {c['nombre']:<25} sport={c['sport_id']:<6} precio={c['precio']:>7.2f} estado={c['estado']}")

    print("\n=== Slots disponibles ===")
    for s in get_slots():
        flag = "" if s["disponible"] else "  (estático ocupado)"
        print(f"  {s['sport_id']:<6} {s['hora']}{flag}")

    print("\n=== Metadatos (validación de fechas) ===")
    for m in get_metadatos():
        print(f"  {m['key']}: {m['valor']}")

    print("\n=== Usuarios ===")
    for u in get_users():
        print(f"  id={u['id']} username={u['username']!r} activo={u['activo']} creado={u['creado_at']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
