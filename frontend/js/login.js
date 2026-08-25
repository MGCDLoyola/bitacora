function loginApp() {
    return {
        vista: "login",
        subtitulos: {
            login: "Acceso al sistema de expedientes",
            solicitar: "Te enviaremos un código de verificación a tu correo",
            confirmar: "Ingresa el código y tu nueva contraseña",
            exito: "Listo"
        },

        correo: "",
        password: "",
        mostrarPassword: false,

        codigo: "",
        passwordNueva: "",
        passwordConfirmar: "",

        error: "",
        cargando: false,

        folio: folioDeHoy(),
        fecha: fechaLegible(),

        irALogin() {
            this.vista = "login";
            this.error = "";
            this.codigo = "";
            this.passwordNueva = "";
            this.passwordConfirmar = "";
        },

        irASolicitarCodigo() {
            this.vista = "solicitar";
            this.error = "";
        },

        async enviarLogin() {
            this.error = "";
            this.cargando = true;

            try {
                const respuesta = await fetch("/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        correo: this.correo,
                        password: this.password
                    })
                });

                if (!respuesta.ok) {
                    this.error = await mensajeDeError(respuesta);
                    return;
                }

                const usuario = await respuesta.json();

                if (usuario.requiere_cambio_password) {
                    window.location.href = "/cambiar-password";
                } else {
                    window.location.href = "/";
                }

            } catch {
                this.error = "No se pudo contactar al servidor. Intenta de nuevo.";
            } finally {
                this.cargando = false;
            }
        },

        async solicitarCodigo() {
            this.error = "";
            this.cargando = true;

            try {
                const respuesta = await fetch("/auth/recuperar-pw", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        correo: this.correo
                    })
                });

                if (!respuesta.ok) {
                    this.error = await mensajeDeError(respuesta);
                    return;
                }

                this.vista = "confirmar";

            } catch {
                this.error = "No se pudo contactar al servidor. Intenta de nuevo.";
            } finally {
                this.cargando = false;
            }
        },

        async confirmarRecuperacion() {
            this.error = "";

            if (this.codigo.length !== 6) {
                this.error = "El código debe tener 6 dígitos.";
                return;
            }

            if (this.passwordNueva.length < 8) {
                this.error = "La contraseña debe tener al menos 8 caracteres.";
                return;
            }

            if (this.passwordNueva !== this.passwordConfirmar) {
                this.error = "Las contraseñas no coinciden.";
                return;
            }

            this.cargando = true;

            try {
                const respuesta = await fetch("/auth/recuperar-pw/confirmar", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        correo: this.correo,
                        codigo: this.codigo,
                        password_nueva: this.passwordNueva
                    })
                });

                if (!respuesta.ok) {
                    this.error = await mensajeDeError(respuesta);
                    return;
                }

                this.vista = "exito";

            } catch {
                this.error = "No se pudo contactar al servidor. Intenta de nuevo.";
            } finally {
                this.cargando = false;
            }
        }
    };
}

async function mensajeDeError(respuesta) {
    try {
        const cuerpo = await respuesta.json();
        if (cuerpo.detail) {
            return cuerpo.detail;
        }
    } catch {
        return "No se pudo completar la solicitud.";
    }

    if (respuesta.status === 401) {
        return "Correo o contraseña incorrectos.";
    }

    return "No se pudo completar la solicitud.";
}

function folioDeHoy() {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `F-${y}${m}${d}`;
}

function fechaLegible() {
    return new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}