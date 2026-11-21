"""add_user.py — Añade un nuevo usuario a Supabase (API REST).

Uso: python add_user.py            (pide usuario y contraseña)
     python add_user.py usuario    (pide solo la contraseña)
"""
from getpass import getpass

from db import get_usuario, hash_password, insert_usuario


def add_user(username, password):
    """Devuelve True si se creó el usuario."""
    if get_usuario(username):
        return False
    cod, _ = insert_usuario(username, hash_password(password))
    return cod < 400


def main():
    import sys

    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    username = (sys.argv[1] if len(sys.argv) > 1 else input("Nuevo usuario: ")).strip()
    if not username:
        print("El nombre de usuario no puede estar vacío.")
        return 1
    if len(sys.argv) > 2:
        password = sys.argv[2]
    else:
        password = getpass("Contraseña (no se muestra al teclear): ")
        confirm = getpass("Confirmar contraseña: ")
        if password != confirm:
            print("✘ Las contraseñas no coinciden.")
            return 1
    if not password:
        print("La contraseña no puede estar vacía.")
        return 1

    if add_user(username, password):
        print(f"✔ Usuario '{username}' añadido a Supabase.")
        return 0
    print(f"⚠ El usuario '{username}' ya existe (se salta).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
