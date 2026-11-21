"""dump_data.py — Muestra los datos de Volleybol desde Supabase (API REST).

Sirve para verificar qué hay en la base de datos después de la migración.
"""
from db import (get_canchas, get_metadatos, get_reservas, get_slots,
                get_sports, get_users)


def main():
    print("=== Sports ===")
    for s in get_sports():
        print(f"  {s['id']:>8}  {s['nombre']:<20} color={s['color']}  img={s['img']}")

    print("\n=== Canchas ===")
    for c in get_canchas():
        print(f"  {c['id']:>2}  {c['nombre']:<25} sport={c['sport_id']:<6} "
              f"precio={float(c['precio']):>7.2f} estado={c['estado']}")

    print("\n=== Slots ===")
    for s in get_slots():
        flag = "" if s["disponible"] else "  (ocupado fijo)"
        print(f"  {s['sport_id']:<6} {s['hora']}{flag}")

    print("\n=== Metadatos ===")
    for m in get_metadatos():
        print(f"  {m['key']}: {m['valor']}")

    print("\n=== Usuarios ===")
    for u in get_users():
        print(f"  id={u['id']} username={u['username']!r} activo={u['activo']}")

    print("\n=== Reservas ===")
    for r in get_reservas():
        print(f"  id={r['id']} {r['cancha_nombre']} {r['fecha']} "
              f"{r['hora_entrada']}-{r['hora_salida']} {r['estado']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
