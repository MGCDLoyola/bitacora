from src.schemas.base import SchemaBase


class LoginRequest(SchemaBase):

    correo   : str
    password : str