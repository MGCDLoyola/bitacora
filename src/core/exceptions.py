class BitacoraError(Exception):

    def __init__(self, mensaje: str):
        self.mensaje = mensaje
        super().__init__(mensaje)


class NoEncontrado(BitacoraError):
    pass


class ConflictoNegocio(BitacoraError):
    pass


class OperacionInvalida(BitacoraError):
    pass


class NoAutorizado(BitacoraError):
    pass


class CambioPasswordRequerido(BitacoraError):
    pass

class PermisoDenegado(BitacoraError):
    pass