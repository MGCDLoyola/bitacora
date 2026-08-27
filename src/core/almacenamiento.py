from datetime import date
from pathlib import Path

from src.core.config import ARCHIVOS_BASE_DIR
from src.models.cliente import Cliente
from src.models.expediente import Expediente
from src.models.usuario import Usuario


def carpeta_cliente(cliente: Cliente) -> Path:
    nombre_carpeta = f"{cliente.nombre} - {cliente.interlocutor}"
    return Path(ARCHIVOS_BASE_DIR) / nombre_carpeta


def carpeta_firmas(usuario: Usuario) -> Path:
    return Path(ARCHIVOS_BASE_DIR) / "firmas" / str(usuario.id)


def carpeta_expediente(cliente: Cliente, expediente: Expediente) -> Path:
    fecha_str = expediente.fecha_creacion.strftime("%d-%m-%Y")
    nombre_carpeta = f"Vencimiento - {fecha_str}"
    return carpeta_cliente(cliente) / nombre_carpeta


def carpeta_vencimiento(cliente: Cliente, expediente: Expediente) -> Path:
    return carpeta_expediente(cliente, expediente) / "1. Información"


def carpeta_gestion(
    cliente: Cliente,
    expediente: Expediente,
    fecha_gestion: date,
    intento: int,
    tipo: str,
) -> Path:
    fecha_str = fecha_gestion.strftime("%d-%m-%Y")

    return (
        carpeta_expediente(cliente, expediente)
        / "3. Gestiones"
        / fecha_str
        / f"Intento {intento}"
        / tipo.capitalize()
    )


def carpeta_cierre(cliente: Cliente, expediente: Expediente) -> Path:
    return carpeta_expediente(cliente, expediente) / "2. Cierre"


def carpeta_consolidacion(cliente: Cliente, expediente: Expediente) -> Path:
    return carpeta_expediente(cliente, expediente) / "4. Consolidación"


def crear_carpeta_cliente(cliente: Cliente) -> None:
    carpeta_cliente(cliente).mkdir(parents=True, exist_ok=True)


def crear_carpeta_firmas(usuario: Usuario) -> None:
    carpeta_firmas(usuario).mkdir(parents=True, exist_ok=True)


def crear_carpeta_expediente(cliente: Cliente, expediente: Expediente) -> None:
    carpeta_expediente(cliente, expediente).mkdir(parents=True, exist_ok=True)


def crear_carpeta_vencimiento(cliente: Cliente, expediente: Expediente) -> None:
    carpeta_vencimiento(cliente, expediente).mkdir(parents=True, exist_ok=True)


def crear_carpeta_gestion(
    cliente: Cliente,
    expediente: Expediente,
    fecha_gestion: date,
    intento: int,
    tipo: str,
) -> None:
    carpeta_gestion(cliente, expediente, fecha_gestion, intento, tipo).mkdir(
        parents=True, exist_ok=True
    )


def crear_carpeta_cierre(cliente: Cliente, expediente: Expediente) -> None:
    carpeta_cierre(cliente, expediente).mkdir(parents=True, exist_ok=True)


def crear_carpeta_consolidacion(cliente: Cliente, expediente: Expediente) -> None:
    carpeta_consolidacion(cliente, expediente).mkdir(parents=True, exist_ok=True)
