from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.core.database import get_session
from src.core.deps import requiere_rol, usuario_actual
from src.models.usuario import Usuario
from src.schemas.cobranza import CobranzaCreate, CobranzaRead
from src.schemas.expediente import (
    ExpedienteRead,
    ExpedienteUpdate,
    ExpedienteGestionRead,
)
from src.services.cobranza import CobranzaService
from src.services.expediente import ExpedienteService
from src.services.pdf_cobranza import PDFCobranzaService
from src.services.pdf_consolidacion import PDFConsolidacionService


router = APIRouter(prefix="/expedientes", tags=["Expedientes"])


@router.get("", response_model=list[ExpedienteRead])
def listar_expedientes(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = ExpedienteService(session)

    return servicio.listar()


@router.get("/mios", response_model=list[ExpedienteRead])
def listar_mis_expedientes(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = ExpedienteService(session)

    return servicio.listar_por_asignado(usuario_actual.id)


@router.get("/buscar", response_model=list[ExpedienteRead])
def buscar_expedientes(
    interlocutor: str | None = None,
    fecha_desde: date | None = None,
    fecha_hasta: date | None = None,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = ExpedienteService(session)

    return servicio.buscar(
        interlocutor=interlocutor,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta
    )


@router.get(
    "/gestiones/del-dia",
    response_model=list[ExpedienteGestionRead]
)
def listar_gestiones_del_dia(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
):
    servicio = ExpedienteService(session)

    return servicio.listar_gestiones_del_dia(
        usuario_actual.id
    )


@router.get(
    "/gestiones/desfasados",
    response_model=list[ExpedienteGestionRead]
)
def listar_gestiones_desfasados(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
):
    servicio = ExpedienteService(session)

    return servicio.listar_gestiones_desfasadas(
        usuario_actual.id
    )


@router.get(
    "/gestiones/consolidacion",
    response_model=list[ExpedienteGestionRead]
)
def listar_gestiones_consolidacion(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
):
    servicio = ExpedienteService(session)

    return servicio.listar_gestiones_consolidacion(
        usuario_actual.id
    )


@router.get(
    "/gestiones/activos",
    response_model=list[ExpedienteGestionRead]
)
def listar_gestiones_activos(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = ExpedienteService(session)

    return servicio.listar_gestiones_activas()


@router.get(
    "/gestiones/resumen",
)
def obtener_resumen_gestiones(
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(
        requiere_rol("Administrador", "Supervisor", "Cobranza")
    ),
):
    servicio = ExpedienteService(session)

    return servicio.contar_gestiones(
        usuario_actual.id
    )


@router.get("/{id_expediente}", response_model=ExpedienteRead)
def obtener_expediente(
    id_expediente: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    servicio = ExpedienteService(session)

    return servicio.obtener(id_expediente)


@router.patch("/{id_expediente}", response_model=ExpedienteRead)
def actualizar_expediente(
    id_expediente: int,
    data: ExpedienteUpdate,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor", "Cobranza")),
):
    servicio = ExpedienteService(session)

    return servicio.actualizar(id_expediente, data)


@router.patch("/{id_expediente}/asignar", response_model=ExpedienteRead)
def asignar_expediente(
    id_expediente: int,
    id_usuario: int | None = None,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor")),
):
    servicio = ExpedienteService(session)

    return servicio.asignar(id_expediente, id_usuario)


@router.delete("/{id_expediente}", status_code=204)
def eliminar_expediente(
    id_expediente: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor")),
):
    servicio = ExpedienteService(session)

    servicio.eliminar(id_expediente)


@router.get("/{id_expediente}/cobranzas", response_model=list[CobranzaRead])
def listar_cobranzas(
    id_expediente: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(usuario_actual),
):
    ExpedienteService(session).obtener(id_expediente)

    return CobranzaService(session).listar_por_expediente(id_expediente)


@router.post("/{id_expediente}/cobranzas/{dia}", response_model=CobranzaRead)
def crear_cobranza(
    id_expediente: int,
    dia: int,
    data: CobranzaCreate,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor", "Cobranza")),
):
    return CobranzaService(session).crear(
        id_expediente=id_expediente,
        id_usuario=usuario_actual.id,
        dia=dia,
        data=data
    )


@router.post("/{id_expediente}/gestiones/{dia}/pdf")
def generar_pdf_cobranza(
    id_expediente: int,
    dia: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor", "Cobranza")),
):
    servicio = PDFCobranzaService(session)

    ruta = servicio.generar(id_expediente, dia)

    return FileResponse(
        path=ruta,
        media_type="application/pdf",
        filename=ruta.name,
    )


@router.post("/{id_expediente}/consolidacion/pdf")
def generar_pdf_consolidacion(
    id_expediente: int,
    session: Session = Depends(get_session),
    usuario_actual: Usuario = Depends(requiere_rol("Administrador", "Supervisor", "Cobranza")),
):
    servicio = PDFConsolidacionService(session)

    ruta = servicio.generar(id_expediente)

    return FileResponse(
        path=ruta,
        media_type="application/pdf",
        filename=ruta.name,
    )