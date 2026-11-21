"""login.py — Mini login: valida usuario + contraseña contra PostgreSQL (DB :volleybol:).

Uso:
  python login.py                      # pide usuario y contraseña
  python login.py admin volleyball    # sin pedir entradas
"""
import sys

from db import connect, verify_password


def login(username, password):
    """Devuelve True si el usuario/contraseña son válidos y activo."""
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT username, password_hash, activo FROM usuarios WHERE username = %s",
            (username,),
        )
        row = cur.fetchone()
    if row is None:
        return False
    if not row["activo"]:
        return False
    return verify_password(password, row["password_hash"])


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    username = sys.argv[1].strip() if len(sys.argv) > 1 else input("Usuario: ").strip()
    password = sys.argv[2] if len(sys.argv) > 2 else input("Contraseña: ")
    if not username:
        print("✘ El usuario no puede estar vacío.")
        return 1
    if login(username, password):
        print(f"✔ ¡Bienvenido, {username}! (DB Volleybol)")
        return 0
    print("✘ Credenciales inválidas (usuario/contraseña no encontradas o no activas).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
