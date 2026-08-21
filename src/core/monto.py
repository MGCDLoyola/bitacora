from datetime import date

from src.core.config import TABLA_V
from src.core.exceptions import ConflictoNegocio
from src.core.pg import pg


def obtener_monto_vencido(interlocutor: str, fecha_ancla: date) -> float | None:

    filas = pg.consultar(
        query=f'''
            SELECT "Monto vencimiento" AS monto_vencimiento
            FROM "{TABLA_V}"
            WHERE "Interlocutor" = :interlocutor
            AND "Fecha" <= :fecha_ancla
            ORDER BY "Fecha" DESC
            LIMIT 1
        ''',
        params={
            "interlocutor": interlocutor,
            "fecha_ancla": fecha_ancla,
        },
        output="dict",
    )

    if not filas:
        return None

    monto_vencimiento = filas[0]["monto_vencimiento"]

    if monto_vencimiento is None:
        raise ConflictoNegocio(
            f"El vencimiento del interlocutor '{interlocutor}' con ancla "
            f"{fecha_ancla:%d/%m/%Y} no tiene monto registrado."
        )

    return monto_vencimiento