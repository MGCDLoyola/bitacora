import shutil
from collections.abc import Sequence
from datetime import date

from sqlalchemy import exists, func, select
from sqlalchemy.orm import joinedload

from src.core.almacenamiento import carpeta_expediente
from src.core.exceptions import ConflictoNegocio, NoEncontrado, OperacionInvalida
from src.models.cobranza import Cobranza
from src.models.documento import Documento
from src.models.expediente import Expediente
from src.models.tipo_documento import TipoDocumento
from src.models.usuario import Usuario
from src.schemas.expediente import (
    ExpedienteGestionRead,
    ExpedienteRead,
    ExpedienteResumenEliminacion,
    ExpedienteUpdate,
)
from src.services.base import BaseService
from src.services.usuario import UsuarioService


class ExpedienteService(BaseService):
    def listar(self) -> Sequence[ExpedienteRead]:

        stmt = (
            select(Expediente)
            .options(
                joinedload(Expediente.cliente),
                joinedload(Expediente.usuario),
            )
            .order_by(Expediente.id)
        )

        expedientes = self.session.execute(stmt).unique().scalars().all()

        return [self._a_read(expediente) for expediente in expedientes]

    def obtener(self, id_expediente: int) -> Expediente:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise NoEncontrado(f"No existe un expediente con id '{id_expediente}'.")

        return expediente

    def obtener_read(self, id_expediente: int) -> ExpedienteRead:

        ultimo_comentario_cobranza = (
            select(Cobranza.comentarios)
            .where(
                Cobranza.id_expediente == Expediente.id,
                Cobranza.comentarios.is_not(None),
                func.trim(Cobranza.comentarios) != "",
            )
            .order_by(Cobranza.fecha.desc(), Cobranza.id.desc())
            .limit(1)
            .scalar_subquery()
        )

        stmt = (
            select(
                Expediente,
                ultimo_comentario_cobranza.label("ultimo_comentario_cobranza"),
            )
            .options(
                joinedload(Expediente.cliente),
                joinedload(Expediente.usuario),
            )
            .where(Expediente.id == id_expediente)
        )

        resultado = self.session.execute(stmt).unique().one_or_none()

        if resultado is None:
            raise NoEncontrado(f"No existe un expediente con id '{id_expediente}'.")

        expediente, ultimo_comentario_cobranza = resultado

        comentarios = (
            ultimo_comentario_cobranza if expediente.estado else expediente.comentarios
        )

        return self._a_read(expediente, comentarios=comentarios)

    _SIN_COMENTARIOS = object()

    def _a_read(
        self,
        expediente: Expediente,
        comentarios=_SIN_COMENTARIOS,
    ) -> ExpedienteRead:

        return ExpedienteRead(
            id=expediente.id,
            interlocutor=expediente.interlocutor,
            nombre_cliente=expediente.cliente.nombre,
            contrato=expediente.cliente.contrato,
            fecha_incumplimiento=expediente.fecha_incumplimiento,
            dia_actual=expediente.dia_actual,
            monto_vencido=expediente.monto_vencido,
            usuario=(
                expediente.usuario.nombre if expediente.usuario is not None else None
            ),
            comentarios=(
                expediente.comentarios
                if comentarios is self._SIN_COMENTARIOS
                else comentarios
            ),
            modo_gestion=self._obtener_gestion(expediente),
        )

    def _obtener_gestion(self, expediente: Expediente) -> str:

        if not expediente.estado:
            return "cerrado"

        if expediente.fecha_desfase is not None:
            return "desfasado"

        if expediente.fecha_consolidacion is not None:
            tipo_consolidacion = self.session.execute(
                select(TipoDocumento.id).where(TipoDocumento.nombre == "Consolidación")
            ).scalar_one_or_none()

            if tipo_consolidacion is None:
                raise ConflictoNegocio(
                    "No existe el tipo de documento 'Consolidación'."
                )

            tiene_documento = self.session.scalar(
                select(
                    exists(
                        select(Documento.id).where(
                            Documento.id_tipo_documento == tipo_consolidacion,
                            Documento.id_expediente == expediente.id,
                        )
                    )
                )
            )

            if not tiene_documento:
                return "consolidacion"

            return "cerrado"

        return "del_dia"

    def crear(
        self,
        interlocutor: str,
        fecha_incumplimiento: date | None = None,
        id_usuario: int | None = None,
        monto_vencido: float | None = None,
    ) -> Expediente:

        expediente = Expediente(
            interlocutor=interlocutor,
            fecha_incumplimiento=fecha_incumplimiento,
            id_usuario=id_usuario,
            monto_vencido=monto_vencido,
        )

        self.session.add(expediente)

        self._guardar(expediente)

        return expediente

    def buscar(
        self,
        interlocutor: str | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None,
    ) -> Sequence[ExpedienteRead]:

        stmt = select(Expediente).options(
            joinedload(Expediente.cliente),
            joinedload(Expediente.usuario),
        )

        if interlocutor is not None:
            stmt = stmt.where(Expediente.interlocutor == interlocutor)

        if fecha_desde is not None:
            stmt = stmt.where(Expediente.fecha_incumplimiento >= fecha_desde)

        if fecha_hasta is not None:
            stmt = stmt.where(Expediente.fecha_incumplimiento <= fecha_hasta)

        stmt = stmt.order_by(Expediente.id)

        expedientes = self.session.execute(stmt).unique().scalars().all()

        return [self._a_read(expediente) for expediente in expedientes]

    def actualizar(self, id_expediente: int, data: ExpedienteUpdate) -> Expediente:

        expediente = self.obtener(id_expediente)

        cambios = data.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            setattr(expediente, campo, valor)

        self._guardar(expediente)

        return expediente

    def guardar_consolidacion(
        self,
        id_expediente: int,
        decision: str,
        justificacion: str,
    ) -> Expediente:

        expediente = self.obtener(id_expediente)

        if expediente.id_usuario is None:
            raise OperacionInvalida(
                "No se puede consolidar un expediente que no tiene responsable asignado."
            )

        if not expediente.estado:
            raise OperacionInvalida("No se puede consolidar un expediente cerrado.")

        if expediente.fecha_consolidacion is None:
            raise OperacionInvalida(
                "El expediente todavía no se encuentra en etapa de consolidación."
            )

        justificacion = justificacion.strip()

        if not justificacion:
            raise OperacionInvalida(
                "Debes proporcionar una justificación para la consolidación."
            )

        expediente.comentarios = f"{decision}:\n\n{justificacion}"

        self._guardar(expediente)

        return expediente

    def cerrar(
        self,
        id_expediente: int,
        usuario_actual: Usuario,
    ) -> Expediente:

        expediente = self.obtener(id_expediente)

        if expediente.id_usuario != usuario_actual.id:
            raise OperacionInvalida(
                "No puedes cerrar un expediente que no tienes asignado."
            )

        expediente.estado = False

        self._guardar(expediente)

        return expediente

    def asignar(
        self, ids: list[int], id_usuario: int | None, usuario_actual: Usuario
    ) -> None:

        expedientes = [self.obtener(id_expediente) for id_expediente in ids]

        if id_usuario is not None:
            usuario_service = UsuarioService(self.session)

            usuario_destino = usuario_service.obtener(id_usuario)

            if not usuario_service.puede_asignar(usuario_actual, usuario_destino):
                raise OperacionInvalida(
                    "No tienes permisos para asignar el expediente a este usuario."
                )

        for expediente in expedientes:
            expediente.id_usuario = id_usuario

        self._commit()

    def listar_por_asignado(self, id_usuario: int) -> Sequence[ExpedienteRead]:

        stmt = (
            select(Expediente)
            .options(
                joinedload(Expediente.cliente),
                joinedload(Expediente.usuario),
            )
            .where(Expediente.id_usuario == id_usuario)
            .order_by(Expediente.id)
        )

        expedientes = self.session.execute(stmt).unique().scalars().all()

        return [self._a_read(expediente) for expediente in expedientes]

    def listar_gestiones_del_dia(
        self, id_usuario: int
    ) -> Sequence[ExpedienteGestionRead]:

        return self._listar_gestiones(
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_desfase.is_(None),
            Expediente.fecha_consolidacion.is_(None),
        )

    def listar_gestiones_desfasadas(
        self, id_usuario: int
    ) -> Sequence[ExpedienteGestionRead]:

        return self._listar_gestiones(
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_desfase.is_not(None),
            Expediente.fecha_consolidacion.is_(None),
        )

    def listar_gestiones_consolidacion(
        self, id_usuario: int
    ) -> Sequence[ExpedienteGestionRead]:

        tiene_documento_consolidacion = exists(
            select(Documento.id)
            .join(TipoDocumento, Documento.id_tipo_documento == TipoDocumento.id)
            .where(
                Documento.id_expediente == Expediente.id,
                TipoDocumento.nombre == "Consolidación",
            )
        )

        return self._listar_gestiones(
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_consolidacion.is_not(None),
            ~tiene_documento_consolidacion,
        )

    def listar_gestiones_activas(self) -> Sequence[ExpedienteGestionRead]:

        tiene_documento_consolidacion = exists(
            select(Documento.id)
            .join(TipoDocumento, Documento.id_tipo_documento == TipoDocumento.id)
            .where(
                Documento.id_expediente == Expediente.id,
                TipoDocumento.nombre == "Consolidación",
            )
        )

        return self._listar_gestiones(
            ~tiene_documento_consolidacion,
        )

    def contar_gestiones(self, id_usuario: int, rol: str) -> dict[str, int]:

        if rol == "Visualizador":
            activos = select(func.count(Expediente.id)).where(
                Expediente.estado.is_(True), Expediente.fecha_consolidacion.is_(None)
            )

            return {"activos": self.session.execute(activos).scalar_one()}

        tiene_documento_consolidacion = exists(
            select(Documento.id)
            .join(TipoDocumento, Documento.id_tipo_documento == TipoDocumento.id)
            .where(
                Documento.id_expediente == Expediente.id,
                TipoDocumento.nombre == "Consolidación",
            )
        )

        del_dia = select(func.count(Expediente.id)).where(
            Expediente.estado.is_(True),
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_desfase.is_(None),
            Expediente.fecha_consolidacion.is_(None),
        )

        desfasados = select(func.count(Expediente.id)).where(
            Expediente.estado.is_(True),
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_desfase.is_not(None),
            Expediente.fecha_consolidacion.is_(None),
        )

        consolidacion = select(func.count(Expediente.id)).where(
            Expediente.estado.is_(True),
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_consolidacion.is_not(None),
            ~tiene_documento_consolidacion,
        )

        activos = select(func.count(Expediente.id)).where(
            Expediente.estado.is_(True),
            ~tiene_documento_consolidacion,
        )

        return {
            "del-dia": self.session.execute(del_dia).scalar_one(),
            "desfasados": self.session.execute(desfasados).scalar_one(),
            "consolidacion": self.session.execute(consolidacion).scalar_one(),
            "activos": self.session.execute(activos).scalar_one(),
        }

    def _listar_gestiones(self, *filtros) -> Sequence[ExpedienteGestionRead]:

        ultima_cobranza_dia = (
            select(Cobranza.dia)
            .where(Cobranza.id_expediente == Expediente.id)
            .order_by(Cobranza.dia.desc(), Cobranza.orden.desc())
            .limit(1)
            .scalar_subquery()
        )

        ultima_cobranza_intentos = (
            select(Cobranza.orden)
            .where(Cobranza.id_expediente == Expediente.id)
            .order_by(Cobranza.dia.desc(), Cobranza.orden.desc())
            .limit(1)
            .scalar_subquery()
        )

        stmt = (
            select(
                Expediente,
                ultima_cobranza_dia.label("dia"),
                ultima_cobranza_intentos.label("intentos"),
            )
            .options(joinedload(Expediente.cliente), joinedload(Expediente.usuario))
            .where(Expediente.estado.is_(True), *filtros)
            .order_by(Expediente.id)
        )

        resultados = self.session.execute(stmt).unique().all()

        return [
            ExpedienteGestionRead(
                id=expediente.id,
                interlocutor=expediente.interlocutor,
                nombre_cliente=expediente.cliente.nombre,
                contrato=expediente.cliente.contrato,
                fecha_incumplimiento=expediente.fecha_incumplimiento,
                dia_actual=expediente.dia_actual,
                monto_vencido=expediente.monto_vencido,
                usuario=(
                    expediente.usuario.nombre
                    if expediente.usuario is not None
                    else None
                ),
                dia=dia,
                intentos=intentos,
            )
            for expediente, dia, intentos in resultados
        ]

    def contar_contenido(self, id_expediente: int) -> ExpedienteResumenEliminacion:

        self.obtener(id_expediente)

        cobranzas = self.session.scalar(
            select(func.count())
            .select_from(Cobranza)
            .where(Cobranza.id_expediente == id_expediente)
        )

        documentos = self.session.scalar(
            select(func.count())
            .select_from(Documento)
            .where(Documento.id_expediente == id_expediente)
        )

        return ExpedienteResumenEliminacion(cobranzas=cobranzas, documentos=documentos)

    def eliminar(
        self,
        ids_expediente: list[int],
    ) -> None:

        if not ids_expediente:
            raise OperacionInvalida(
                "Debes proporcionar al menos un expediente para eliminar."
            )

        expedientes = (
            self.session.execute(
                select(Expediente).where(Expediente.id.in_(ids_expediente))
            )
            .scalars()
            .all()
        )

        encontrados = {expediente.id for expediente in expedientes}

        faltantes = set(ids_expediente) - encontrados

        if faltantes:
            raise NoEncontrado(
                f"No existen los expedientes: {', '.join(map(str, sorted(faltantes)))}."
            )

        errores = []

        for expediente in expedientes:
            carpeta = carpeta_expediente(expediente.cliente, expediente)

            try:
                if carpeta.exists():
                    shutil.rmtree(carpeta)
            except OSError as error:
                errores.append(
                    f"{expediente.id}: no se pudo eliminar la carpeta ({error})"
                )
                continue

            try:
                self.session.delete(expediente)
                self._commit()
            except Exception as error:
                self.session.rollback()
                errores.append(
                    f"{expediente.id}: no se pudo eliminar el registro ({error})"
                )

        if errores:
            raise OperacionInvalida(
                f"No se pudieron eliminar todos los expedientes: {'; '.join(errores)}."
            )
