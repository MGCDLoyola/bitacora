from src.schemas.base import SchemaBase
from src.schemas.rol import RolRead

class UsuarioBase(SchemaBase):

    nombre  : str
    correo  : str
    activo  : bool = True

class UsuarioCreate(UsuarioBase):

    id_rol: int

class UsuarioUpdate(SchemaBase):

    nombre  : str  | None = None
    correo  : str  | None = None
    activo  : bool | None = None
    id_rol  : int  | None = None
    firma   : str  | None = None

class UsuarioRead(UsuarioBase):

    id    : int
    rol   : RolRead
    firma : str | None = None
    requiere_cambio_password : bool