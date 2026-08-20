from datetime import date

from src.core.config import TABLA_V
from src.core.exceptions import ConflictoNegocio
from src.core.pg import pg


def obtener_montos_vencido(interlocutor: str, fecha_creacion: date, cantidad: int) -> list[dict]:

    filas = pg.consultar(
        query=f'''
            SELECT "Fecha" AS fecha, "Monto vencimiento" AS monto_vencimiento
            FROM "{TABLA_V}"
            WHERE "Interlocutor" = :interlocutor
            AND "Fecha" >= :fecha_creacion
            ORDER BY "Fecha" ASC
            LIMIT :cantidad
        ''',
        params={
            "interlocutor": interlocutor,
            "fecha_creacion": fecha_creacion,
            "cantidad": cantidad,
        },
        output="dict",
    )

    if len(filas) < cantidad:
        raise ConflictoNegocio(
            f"No se encontraron suficientes registros de vencimiento para el "
            f"interlocutor '{interlocutor}'. Se esperaban al menos {cantidad}, "
            f"se encontraron {len(filas)}."
        )

    monto_faltante = next(
        (fila for fila in filas if fila["monto_vencimiento"] is None),
        None
    )

    if monto_faltante is not None:
        raise ConflictoNegocio(
            f"El vencimiento del interlocutor '{interlocutor}' con fecha "
            f"{monto_faltante['fecha']:%d/%m/%Y} no tiene monto registrado."
        )

    return filas