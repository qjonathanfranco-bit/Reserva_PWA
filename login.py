"""login.py — Valida usuario + contraseña contra Supabase (API REST).

Uso:
  python login.py                      # pide usuario y contraseña
  python login.py admin volleyball    # sin pedir entradas
"""
import sys

from db import get_usuario, verify_password


def login(username, password):
    """Devuelve True si el usuario/contraseña son válidos y está activo."""
    fila = get_usuario(username)
    if not fila or not fila.get("activo"):
        return False
    return verify_password(password, fila["password_hash"])


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
        print(f"✔ ¡Bienvenido, {username}! (Supabase)")
        return 0
    print("✘ Credenciales inválidas (usuario/contraseña no encontradas o no activas).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
