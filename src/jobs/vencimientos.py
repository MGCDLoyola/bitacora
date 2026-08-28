import logging
from datetime import date, datetime
from decimal import Decimal

from mdb import PostgreSQL
from sqlalchemy import select
from sqlalchemy.orm import Session, load_only

from src.core.almacenamiento import (
    crear_carpeta_cliente,
    crear_carpeta_expediente,
)
from src.core.config import MAX_DIAS, TABLA_D, TABLA_V
from src.core.exceptions import ConflictoNegocio
from src.core.respaldo import crear_respaldo
from src.models.cliente import Cliente
from src.models.documento import Documento
from src.models.expediente import Expediente
from src.models.tipo_documento import TipoDocumento
from src.services.cliente import ClienteService
from src.services.expediente import ExpedienteService

logger = logging.getLogger(__name__)


def obtener_vencimientos(pg: PostgreSQL) -> dict[date, dict[str, Decimal]]:

    query = f'''
        SELECT
            "Interlocutor" AS interlocutor,
            "Fecha" AS fecha,
            "Monto vencimiento" AS monto_vencimiento
        FROM "{TABLA_V}"
        WHERE "Fecha" IN (
            SELECT DISTINCT "Fecha"
            FROM "{TABLA_V}"
            ORDER BY "Fecha" DESC
            LIMIT 10
        )
        AND "Condiciones de pago" LIKE 'CP%'
        AND "Condiciones de pago" <> 'CP00'
        AND "Interlocutor" LIKE 'F%'
    '''

    filas = pg.consultar(query=query, output="dict", parse_dates="fecha")

    vencimientos: dict[date, dict[str, Decimal]] = {}

    for fila in filas or []:
        fecha = fila["fecha"]

        if isinstance(fecha, datetime):
            fecha = fecha.date()
        elif not isinstance(fecha, date):
            raise TypeError(f"Fecha de vencimiento inválida: {fecha!r}")

        interlocutor = fila["interlocutor"]
        monto = fila["monto_vencimiento"]

        if monto is None:
            raise ConflictoNegocio(
                f"El vencimiento del interlocutor '{interlocutor}' "
                f"con fecha {fecha:%d/%m/%Y} no tiene monto registrado."
            )

        vencimientos.setdefault(fecha, {})[interlocutor] = monto

    return dict(sorted(vencimientos.items(), reverse=True))


def obtener_expedientes_activos(session: Session) -> list[Expediente]:

    stmt = (
        select(Expediente)
        .where(Expediente.estado.is_(True))
        .options(
            load_only(
                Expediente.id,
                Expediente.interlocutor,
                Expediente.fecha_creacion,
                Expediente.fecha_consolidacion,
                Expediente.fecha_desfase,
                Expediente.monto_vencido,
                Expediente.dia_actual,
            )
        )
    )

    return list(session.execute(stmt).scalars().all())


def obtener_interlocutores_consolidados(
    vencimientos: dict[date, dict[str, Decimal]], hoy: date
) -> tuple[set[str], date | None]:

    if hoy not in vencimientos:
        return set(), None

    ultimos_bloques = list(vencimientos)[:5]

    if len(ultimos_bloques) < 5:
        return set(), None

    interlocutores = set.intersection(
        *(set(vencimientos[fecha]) for fecha in ultimos_bloques)
    )

    fecha_bloque_mas_antiguo = ultimos_bloques[-1]

    return interlocutores, fecha_bloque_mas_antiguo


def obtener_interlocutores_con_documento_consolidacion(
    session: Session, expedientes: list[Expediente]
) -> set[int]:

    if not expedientes:
        return set()

    tipo_consolidacion = session.execute(
        select(TipoDocumento.id).where(TipoDocumento.nombre == "Consolidación")
    ).scalar_one_or_none()

    if tipo_consolidacion is None:
        raise ConflictoNegocio("No existe el tipo de documento 'Consolidación'.")

    expediente_ids = [expediente.id for expediente in expedientes]

    stmt = select(Documento.id_expediente).where(
        Documento.id_tipo_documento == tipo_consolidacion,
        Documento.id_expediente.in_(expediente_ids),
    )

    return set(session.execute(stmt).scalars().all())


def procesar_expedientes_en_consolidacion(
    session: Session, vencimientos_hoy: set[str], expedientes: list[Expediente]
) -> None:

    en_consolidacion = [
        expediente
        for expediente in expedientes
        if expediente.fecha_consolidacion is not None
    ]

    por_cerrar = [
        expediente
        for expediente in en_consolidacion
        if expediente.interlocutor not in vencimientos_hoy
    ]

    if not por_cerrar:
        return

    expedientes_con_documento = obtener_interlocutores_con_documento_consolidacion(
        session, por_cerrar
    )

    for expediente in por_cerrar:
        if expediente.id not in expedientes_con_documento:
            continue

        expediente.fecha_desfase = date.today()
        expediente.estado = False

        logger.info(
            "Expediente %s cerrado: tiene fecha de consolidación "
            "y documento de Consolidación.",
            expediente.id,
        )


def procesar_expedientes_en_revision(
    vencimientos: dict[date, dict[str, Decimal]],
    expedientes: list[Expediente],
    hoy: date,
) -> None:

    vencimientos_hoy = vencimientos.get(hoy, {})

    interlocutores_consolidados, fecha_bloque_mas_antiguo = (
        obtener_interlocutores_consolidados(vencimientos, hoy)
    )

    for expediente in expedientes:
        if expediente.interlocutor in vencimientos_hoy:
            expediente.monto_vencido = vencimientos_hoy[expediente.interlocutor]

        if (
            expediente.fecha_consolidacion is not None
            or expediente.fecha_desfase is not None
        ):
            continue

        if (
            expediente.interlocutor in interlocutores_consolidados
            and expediente.fecha_creacion.date() == fecha_bloque_mas_antiguo
        ):
            expediente.fecha_consolidacion = hoy
            expediente.dia_actual += 1

            logger.info(
                "Expediente %s entra en consolidación: "
                "interlocutor '%s' apareció en los últimos 5 bloques "
                "desde su fecha de creación.",
                expediente.id,
                expediente.interlocutor,
            )

            continue

        if expediente.interlocutor not in vencimientos_hoy:
            expediente.fecha_desfase = hoy

            logger.info(
                "Expediente %s entra en desfase: "
                "interlocutor '%s' no aparece en vencimientos de hoy.",
                expediente.id,
                expediente.interlocutor,
            )


def incrementar_dia_actual(expedientes: list[Expediente]) -> None:

    for expediente in expedientes:
        if (
            expediente.fecha_consolidacion is not None
            or expediente.fecha_desfase is not None
        ):
            continue

        if expediente.dia_actual >= MAX_DIAS:
            continue

        expediente.dia_actual += 1

        logger.info(
            "Expediente %s avanza a día %d.", expediente.id, expediente.dia_actual
        )


def obtener_expedientes_por_interlocutor(
    expedientes: list[Expediente],
) -> dict[str, Expediente]:

    return {expediente.interlocutor: expediente for expediente in expedientes}


def sincronizar_clientes(
    pg: PostgreSQL, session: Session, vencimientos_hoy: set[str]
) -> None:

    if not vencimientos_hoy:
        return

    clientes_existentes = set(
        session.execute(
            select(Cliente.interlocutor).where(
                Cliente.interlocutor.in_(vencimientos_hoy)
            )
        )
        .scalars()
        .all()
    )

    nuevos_clientes = vencimientos_hoy - clientes_existentes

    if not nuevos_clientes:
        return

    contactos = {
        contacto["interlocutor"]: contacto
        for contacto in obtener_contactos(pg, nuevos_clientes)
    }

    cliente_service = ClienteService(session)

    for interlocutor in nuevos_clientes:
        datos = contactos.get(interlocutor)

        if datos is None:
            logger.warning(
                "Interlocutor nuevo '%s' sin datos de contacto. "
                "Se crea con datos por confirmar.",
                interlocutor,
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
                contrato=None,
            )

        else:
            cliente = cliente_service.crear(
                interlocutor=interlocutor,
                central=datos["central"],
                nombre=datos["nombre"],
                correo=datos["correo"],
                contrato=datos["contrato"],
            )

        crear_carpeta_cliente(cliente)


def crear_expedientes_nuevos(
    session: Session,
    vencimientos_hoy: dict[str, Decimal],
    expedientes: list[Expediente],
) -> None:

    expedientes_por_interlocutor = obtener_expedientes_por_interlocutor(expedientes)

    nuevos_expedientes = set(vencimientos_hoy) - expedientes_por_interlocutor.keys()

    if not nuevos_expedientes:
        return

    expediente_service = ExpedienteService(session)
    hoy = date.today()

    for interlocutor in nuevos_expedientes:
        cliente = session.get(Cliente, interlocutor)

        if cliente is None:
            logger.error(
                "No se encontró Cliente para interlocutor '%s' al crear expediente.",
                interlocutor,
            )

            continue

        expediente = expediente_service.crear(
            interlocutor=interlocutor,
            fecha_incumplimiento=hoy,
            id_usuario=None,
            monto_vencido=vencimientos_hoy[interlocutor],
        )

        crear_carpeta_expediente(cliente, expediente)

        logger.info(
            "Nuevo expediente %s creado para interlocutor '%s'.",
            expediente.id,
            interlocutor,
        )


def procesar_vencimientos(pg: PostgreSQL, session: Session) -> None:

    vencimientos = obtener_vencimientos(pg)
    hoy = date.today()

    if hoy in vencimientos:
        logger.info(
            "Se encontró el bloque de vencimientos de hoy (%s): %d interlocutores.",
            hoy,
            len(vencimientos[hoy]),
        )

    else:
        logger.warning(
            "No se encontró el bloque de vencimientos de hoy (%s). "
            "Se interpreta como cero vencimientos para hoy.",
            hoy,
        )

    respaldo = crear_respaldo()

    logger.info("Respaldo de PostgreSQL generado correctamente: %s", respaldo)

    vencimientos_hoy = vencimientos.get(hoy, {})

    interlocutores_hoy = set(vencimientos_hoy)

    sincronizar_clientes(pg=pg, session=session, vencimientos_hoy=interlocutores_hoy)

    expedientes = obtener_expedientes_activos(session)

    logger.info("Se encontraron %d expedientes activos.", len(expedientes))

    procesar_expedientes_en_consolidacion(
        session=session, vencimientos_hoy=interlocutores_hoy, expedientes=expedientes
    )

    procesar_expedientes_en_revision(
        vencimientos=vencimientos, expedientes=expedientes, hoy=hoy
    )

    incrementar_dia_actual(expedientes=expedientes)

    crear_expedientes_nuevos(
        session=session, vencimientos_hoy=vencimientos_hoy, expedientes=expedientes
    )

    session.commit()

    logger.info("Procesamiento de vencimientos finalizado correctamente.")


def obtener_contactos(pg: PostgreSQL, interlocutores: set[str]) -> list[dict]:

    if not interlocutores:
        return []

    query = f"""
        SELECT
            interlocutor,
            central,
            nombre,
            correo,
            contrato
        FROM "{TABLA_D}"
        WHERE interlocutor = ANY(:interlocutores)
    """

    return pg.consultar(
        query=query, params={"interlocutores": list(interlocutores)}, output="dict"
    )
