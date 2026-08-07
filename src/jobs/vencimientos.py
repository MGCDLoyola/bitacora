import logging
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from mdb import PostgreSQL

from src.models.cliente import Cliente
from src.models.expediente import Expediente
from src.services.cliente import ClienteService
from src.services.expediente import ExpedienteService
from src.core.almacenamiento import (
    crear_carpeta_cliente,
    crear_carpeta_expediente,
)
from src.core.config import TABLA_V, TABLA_D

logger = logging.getLogger(__name__)


def comparar_interlocutores(
    vencimientos: set[str],
    clientes: set[str]
) -> tuple[set[str], set[str]]:
    nuevos = vencimientos - clientes
    todos = clientes | nuevos

    return nuevos, todos


def comparar_expedientes(
    vencimientos: set[str],
    expedientes: set[str]
) -> tuple[set[str], set[str], set[str]]:
    desfase = expedientes - vencimientos
    consecutivo = vencimientos & expedientes
    nuevos = vencimientos - expedientes

    return desfase, consecutivo, nuevos


def obtener_vencimientos(
    pg: PostgreSQL
) -> tuple[date, set[str]]:

    query = f'''
        SELECT
            "Interlocutor" AS interlocutor,
            "Fecha" AS fecha
        FROM "{TABLA_V}"
        WHERE "Fecha" = (
            SELECT MAX("Fecha")
            FROM "{TABLA_V}"
        )
        AND "Condiciones de pago" LIKE 'CP%'
        AND "Condiciones de pago" <> 'CP00'
        AND "Interlocutor" LIKE 'F%'
    '''

    filas = pg.consultar(
        query=query,
        output="dict",
        parse_dates="fecha"
    )

    if not filas:
        raise ValueError("No se encontraron vencimientos.")

    fecha_vencimiento = filas[0]["fecha"]

    if isinstance(fecha_vencimiento, datetime):
        fecha_vencimiento = fecha_vencimiento.date()
    elif not isinstance(fecha_vencimiento, date):
        raise TypeError(
            f"Fecha de vencimiento inválida: {fecha_vencimiento!r}"
        )

    interlocutores = {
        fila["interlocutor"]
        for fila in filas
    }

    return fecha_vencimiento, interlocutores


def obtener_interlocutores_cliente(
    session: Session
) -> set[str]:
    stmt = select(Cliente.interlocutor)

    return set(
        session.execute(stmt)
        .scalars()
        .all()
    )


def obtener_interlocutores_expediente_activo(
    session: Session
) -> set[str]:
    stmt = (
        select(Expediente.interlocutor)
        .where(
            Expediente.estado.is_(True),
            Expediente.fecha_consolidacion.is_(None)
        )
    )

    return set(
        session.execute(stmt)
        .scalars()
        .all()
    )


def obtener_contactos(
    pg: PostgreSQL,
    interlocutores: set[str]
) -> list[dict]:
    query = f"""
        SELECT *
        FROM "{TABLA_D}"
        WHERE interlocutor = ANY(:interlocutores)
    """

    return pg.consultar(
        query=query,
        params={
            "interlocutores": list(interlocutores)
        },
        output="dict"
    )


def procesar_clientes(
    pg: PostgreSQL,
    session: Session
) -> None:

    fecha, vencimientos = obtener_vencimientos(pg)

    clientes_existentes = obtener_interlocutores_cliente(session)

    nuevos, todos = comparar_interlocutores(
        vencimientos,
        clientes_existentes
    )

    repetidos = vencimientos - nuevos

    contactos = {
        c["interlocutor"]: c
        for c in obtener_contactos(pg, todos)
    }

    cliente_service = ClienteService(session)

    for interlocutor in nuevos:

        datos = contactos.get(interlocutor)

        if datos is None:
            logger.warning(
                "Interlocutor nuevo '%s' sin datos de contacto, "
                "se crea con datos por confirmar",
                interlocutor
            )

            cliente = cliente_service.crear(
                interlocutor=interlocutor,
                central=(
                    interlocutor
                    if interlocutor.startswith("FF")
                    else f"F{interlocutor[0:5]}"
                ),
                nombre="Por confirmar",
                correo=None,
                contrato=None
            )

        else:
            cliente = cliente_service.crear(
                interlocutor=interlocutor,
                central=datos["central"],
                nombre=datos["nombre"],
                correo=datos["correo"],
                contrato=datos["contrato"]
            )

        crear_carpeta_cliente(cliente)

    for interlocutor in repetidos:

        datos = contactos.get(interlocutor)

        if datos is None:
            logger.warning(
                "Interlocutor repetido '%s' sin datos de contacto, "
                "no se actualiza",
                interlocutor
            )
            continue

        cliente_service.actualizar(
            interlocutor,
            datos["correo"],
            datos["contrato"]
        )

    expedientes_activos = obtener_interlocutores_expediente_activo(
        session
    )

    desfase, consecutivo, nuevos_expedientes = comparar_expedientes(
        vencimientos,
        expedientes_activos
    )

    expediente_service = ExpedienteService(session)

    for interlocutor in nuevos_expedientes:

        cliente = session.get(
            Cliente,
            interlocutor
        )

        if cliente is None:
            logger.error(
                "No se encontró Cliente para interlocutor '%s' "
                "al crear expediente",
                interlocutor
            )
            continue

        expediente = expediente_service.crear(
            interlocutor=interlocutor,
            fecha_incumplimiento=fecha,
            id_usuario=None
        )

        crear_carpeta_expediente(
            cliente,
            expediente
        )

    logger.info(
        "Procesamiento de vencimientos: %d nuevos, "
        "%d consecutivos, %d desfasados",
        len(nuevos_expedientes),
        len(consecutivo),
        len(desfase)
    )