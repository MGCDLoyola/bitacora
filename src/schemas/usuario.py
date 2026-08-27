from src.schemas.base import SchemaBase
from src.schemas.rol import RolRead


class UsuarioBase(SchemaBase):
    nombre: str
    correo: str
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    id_rol: int


class UsuarioUpdate(SchemaBase):
    nombre: str | None = None
    correo: str | None = None
    activo: bool | None = None
    id_rol: int | None = None


class UsuarioUpdateSupervisor(SchemaBase):
    activo: bool | None = None


class UsuarioRead(UsuarioBase):
    id: int
    rol: RolRead
    firma: bool = False
    requiere_cambio_password: bool


class UsuarioRolMasivo(SchemaBase):
    ids: list[int]
    id_rol: int


class UsuarioEstadoMasivo(SchemaBase):
    ids: list[int]
    activo: bool
