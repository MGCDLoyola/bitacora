"""
Sanity check de obtener_monto_vencido contra TABLA_V real.

Correr desde la raíz del proyecto:
    python -m scripts.sanity_check_monto_vencido

No modifica nada, solo lee.
"""

from datetime import timedelta

from src.core.config import TABLA_V
from src.core.monto import obtener_monto_vencido
from src.core.pg import pg


def buscar_interlocutor_con_historial(minimo_bloques: int = 5) -> str | None:
    """Encuentra un interlocutor real con varios bloques distintos en
    TABLA_V, para no tener que buscarlo a mano."""

    filas = pg.consultar(
        query=f'''
            SELECT "Interlocutor" AS interlocutor, COUNT(DISTINCT "Fecha") AS bloques
            FROM "{TABLA_V}"
            GROUP BY "Interlocutor"
            HAVING COUNT(DISTINCT "Fecha") >= :minimo
            ORDER BY bloques DESC
            LIMIT 1
        ''',
        params={"minimo": minimo_bloques},
        output="dict",
    )

    if not filas:
        return None

    return filas[0]["interlocutor"]


def mostrar_historial(interlocutor: str, limite: int = 10) -> None:

    filas = pg.consultar(
        query=f'''
            SELECT "Fecha" AS fecha, "Monto vencimiento" AS monto
            FROM "{TABLA_V}"
            WHERE "Interlocutor" = :interlocutor
            ORDER BY "Fecha" DESC
            LIMIT :limite
        ''',
        params={"interlocutor": interlocutor, "limite": limite},
        output="dict",
        parse_dates="fecha",
    )

    print(f"\nÚltimos {len(filas)} bloques reales de '{interlocutor}' en {TABLA_V}:")
    for fila in filas:
        fecha = fila["fecha"]
        fecha_str = fecha.date() if hasattr(fecha, "date") else fecha
        print(f"  {fecha_str}  ->  {fila['monto']}")

    return filas


def main():

    pg.conectar()

    try:
        interlocutor = input(
            "Interlocutor a probar (Enter para que el script busque uno con historial): "
        ).strip()

        if not interlocutor:
            interlocutor = buscar_interlocutor_con_historial()
            if interlocutor is None:
                print("No encontré ningún interlocutor con suficiente historial.")
                return
            print(f"Usando interlocutor encontrado: {interlocutor}")

        filas = mostrar_historial(interlocutor)

        if not filas:
            print(f"'{interlocutor}' no tiene registros en {TABLA_V}.")
            return

        fecha_mas_reciente = filas[0]["fecha"]
        fecha_mas_reciente = (
            fecha_mas_reciente.date()
            if hasattr(fecha_mas_reciente, "date")
            else fecha_mas_reciente
        )

        fecha_mas_antigua_real = pg.consultar(
            query=f'''
                SELECT MIN("Fecha") AS fecha
                FROM "{TABLA_V}"
                WHERE "Interlocutor" = :interlocutor
            ''',
            params={"interlocutor": interlocutor},
            output="dict",
            parse_dates="fecha",
        )[0]["fecha"]

        fecha_mas_antigua_real = (
            fecha_mas_antigua_real.date()
            if hasattr(fecha_mas_antigua_real, "date")
            else fecha_mas_antigua_real
        )

        print(
            f"\nPrimer registro real de '{interlocutor}' en {TABLA_V}: {fecha_mas_antigua_real}"
        )

        print("\nProbando obtener_monto_vencido con distintas anclas:\n")

        casos = {
            "Ancla exacta al bloque más reciente": fecha_mas_reciente,
            "Ancla un día después (ej. fin de semana)": fecha_mas_reciente
            + timedelta(days=1),
            "Ancla un día antes del primer registro real (debe dar None)": fecha_mas_antigua_real
            - timedelta(days=1),
        }

        for etiqueta, fecha_ancla in casos.items():
            try:
                resultado = obtener_monto_vencido(interlocutor, fecha_ancla)
                print(f"  {etiqueta}: ancla={fecha_ancla} -> monto={resultado}")
            except Exception as error:
                print(f"  {etiqueta}: ancla={fecha_ancla} -> ERROR: {error}")

    finally:
        pg.desconectar()


if __name__ == "__main__":
    main()
