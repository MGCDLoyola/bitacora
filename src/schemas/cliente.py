from src.schemas.base import SchemaBase


class ClienteBase(SchemaBase):
    central: str
    nombre: str
    correo: str | None = None
    contrato: str | None = None


class ClienteRead(ClienteBase):
    interlocutor: str
