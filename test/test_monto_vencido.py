from src.core.pg import pg
from src.core.config import TABLA_V


def main():
    interlocutor = input("Interlocutor: ").strip()
    fecha = input("Fecha objetivo (YYYY-MM-DD): ").strip()

    pg.conectar()

    try:
        filas = pg.consultar(
            query=f'''
                SELECT
                    "Fecha" AS fecha,
                    "Monto vencimiento" AS monto_vencimiento
                FROM "{TABLA_V}"
                WHERE "Interlocutor" = :interlocutor
                  AND "Fecha" <= :fecha_objetivo
                ORDER BY "Fecha" DESC
                LIMIT 1
            ''',
            params={
                "interlocutor": interlocutor,
                "fecha_objetivo": fecha,
            },
            output="dict",
            parse_dates="fecha",
        )

        print("\nResultado:")
        print(filas)

    finally:
        pg.desconectar()


if __name__ == "__main__":
    main()