from src.core.config import RECUPERACION_DURACION_MINUTOS


def correo_alta_usuario(
    nombre: str,
    correo: str,
    password: str,
) -> str:

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Acceso a Bitácora</title>
    </head>
    <body>
        <h2>Bienvenido a Bitácora</h2>

        <p>Hola, {nombre}:</p>

        <p>
            Se ha creado tu usuario para acceder a Bitácora.
        </p>

        <p>
            <strong>Correo:</strong> {correo}<br>
            <strong>Contraseña temporal:</strong> {password}
        </p>

        <p>
            Por seguridad, deberás cambiar tu contraseña al ingresar por primera vez.
        </p>

        <p>
            Saludos,<br>
            MGC México
        </p>
    </body>
    </html>
    """


def correo_recuperacion_password(
    nombre: str,
    codigo: str,
) -> str:

    return f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de contraseña — Bitácora</title>
    </head>
    <body>
        <h2>Recuperación de contraseña</h2>

        <p>Hola, {nombre}:</p>

        <p>
            Recibimos una solicitud para restablecer tu contraseña en Bitácora.
        </p>

        <p>
            <strong>Código de verificación:</strong> {codigo}
        </p>

        <p>
            Este código vence en {RECUPERACION_DURACION_MINUTOS} minutos. Si tú no solicitaste este cambio, ignora este correo.
        </p>

        <p>
            Saludos,<br>
            MGC México
        </p>
    </body>
    </html>
    """
