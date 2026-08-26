from datetime import date
import shutil

from sqlalchemy import exists, select
from sqlalchemy.orm import joinedload

from src.models.expediente import Expediente
from src.models.documento import Documento
from src.models.tipo_documento import TipoDocumento

from src.core.almacenamiento import carpeta_expediente
from src.core.exceptions import NoEncontrado

from src.schemas.expediente import (
    ExpedienteUpdate,
    ExpedienteGestionRead,
)

from src.services.usuario import UsuarioService
from src.services.base import BaseService

from collections.abc import Sequence


class ExpedienteService(BaseService):

    def listar(self) -> Sequence[Expediente]:

        stmt = (
            select(Expediente)
            .order_by(Expediente.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def obtener(self, id_expediente: int) -> Expediente:

        expediente = self.session.get(Expediente, id_expediente)

        if expediente is None:
            raise NoEncontrado(
                f"No existe un expediente con id '{id_expediente}'."
            )

        return expediente

    def crear(
        self,
        interlocutor: str,
        fecha_incumplimiento: date | None = None,
        id_usuario: int | None = None,
        monto_vencido: float | None = None
    ) -> Expediente:

        expediente = Expediente(
            interlocutor=interlocutor,
            fecha_incumplimiento=fecha_incumplimiento,
            id_usuario=id_usuario,
            monto_vencido=monto_vencido
        )

        self.session.add(expediente)

        self._guardar(expediente)

        return expediente

    def buscar(
        self,
        interlocutor: str | None = None,
        fecha_desde: date | None = None,
        fecha_hasta: date | None = None
    ) -> Sequence[Expediente]:

        stmt = select(Expediente)

        if interlocutor is not None:
            stmt = stmt.where(
                Expediente.interlocutor == interlocutor
            )

        if fecha_desde is not None:
            stmt = stmt.where(
                Expediente.fecha_incumplimiento >= fecha_desde
            )

        if fecha_hasta is not None:
            stmt = stmt.where(
                Expediente.fecha_incumplimiento <= fecha_hasta
            )

        stmt = stmt.order_by(Expediente.id)

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def actualizar(
        self,
        id_expediente: int,
        data: ExpedienteUpdate
    ) -> Expediente:

        expediente = self.obtener(id_expediente)

        cambios = data.model_dump(exclude_unset=True)

        for campo, valor in cambios.items():
            setattr(expediente, campo, valor)

        self._guardar(expediente)

        return expediente

    def asignar(
        self,
        id_expediente: int,
        id_usuario: int | None
    ) -> Expediente:

        expediente = self.obtener(id_expediente)

        if id_usuario is not None:

            UsuarioService(self.session).obtener(
                id_usuario,
                activos=True,
                cobranza=True
            )

        expediente.id_usuario = id_usuario

        self._guardar(expediente)

        return expediente

    def listar_por_asignado(
        self,
        id_usuario: int
    ) -> Sequence[Expediente]:

        stmt = (
            select(Expediente)
            .where(
                Expediente.id_usuario == id_usuario
            )
            .order_by(Expediente.id)
        )

        return (
            self.session
            .execute(stmt)
            .scalars()
            .all()
        )

    def listar_gestiones_del_dia(
        self,
        id_usuario: int
    ) -> Sequence[ExpedienteGestionRead]:

        return self._listar_gestiones(
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_desfase.is_(None),
            Expediente.fecha_consolidacion.is_(None)
        )

    def listar_gestiones_desfasadas(
        self,
        id_usuario: int
    ) -> Sequence[ExpedienteGestionRead]:

        return self._listar_gestiones(
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_desfase.is_not(None),
            Expediente.fecha_consolidacion.is_(None)
        )

    def listar_gestiones_consolidacion(
        self,
        id_usuario: int
    ) -> Sequence[ExpedienteGestionRead]:

        tiene_documento_consolidacion = exists(
            select(Documento.id)
            .join(
                TipoDocumento,
                Documento.id_tipo_documento == TipoDocumento.id
            )
            .where(
                Documento.id_expediente == Expediente.id,
                TipoDocumento.nombre == "Consolidación"
            )
        )

        return self._listar_gestiones(
            Expediente.id_usuario == id_usuario,
            Expediente.fecha_consolidacion.is_not(None),
            ~tiene_documento_consolidacion
        )

    def listar_gestiones_activas(
        self
    ) -> Sequence[ExpedienteGestionRead]:

        return self._listar_gestiones(
            Expediente.fecha_consolidacion.is_(None)
        )

    def _listar_gestiones(
        self,
        *filtros
    ) -> Sequence[ExpedienteGestionRead]:

        stmt = (
            select(Expediente)
            .options(
                joinedload(Expediente.cliente),
                joinedload(Expediente.usuario)
            )
            .where(
                Expediente.estado.is_(True),
                *filtros
            )
            .order_by(Expediente.id)
        )

        expedientes = (
            self.session
            .execute(stmt)
            .scalars()
            .unique()
            .all()
        )

        return [
            ExpedienteGestionRead(
                id=expediente.id,
                interlocutor=expediente.interlocutor,
                nombre_cliente=expediente.cliente.nombre,
                contrato=expediente.cliente.contrato,
                monto_vencido=expediente.monto_vencido,
                usuario=(
                    expediente.usuario.nombre
                    if expediente.usuario is not None
                    else None
                )
            )
            for expediente in expedientes
        ]

    def eliminar(
        self,
        id_expediente: int
    ) -> None:

        expediente = self.obtener(id_expediente)

        cliente = expediente.cliente

        carpeta = carpeta_expediente(
            cliente,
            expediente
        )

        self.session.delete(expediente)

        self._commit()

        if carpeta.exists():
            shutil.rmtree(carpeta)