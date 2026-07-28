from datetime import date
from pathlib import Path

from src.core.config import ARCHIVOS_BASE_DIR
from src.models.cliente import Cliente
from src.models.expediente import Expediente
from src.models.usuario import Usuario


def carpeta_cliente(cliente: Cliente) -> Path:
    nombre_carpeta = f"{cliente.interlocutor} - {cliente.nombre}"
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
    intento: int
) -> Path:
    fecha_str = fecha_gestion.strftime("%d-%m-%Y")

    return (
        carpeta_expediente(cliente, expediente)
        / "3. Gestiones"
        / fecha_str
        / f"Intento {intento}"
    )


def carpeta_cierre(cliente: Cliente, expediente: Expediente) -> Path:
    return carpeta_expediente(cliente, expediente) / "2. Cierre"

def carpeta_consolidacion (cliente: Cliente, expediente: Expediente) -> Path:
    return carpeta_expediente(cliente, expediente) / "4. Consolidación"