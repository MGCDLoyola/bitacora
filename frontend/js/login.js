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
        mostrarPasswordNueva: false,
        mostrarPasswordConfirmar: false,    

        codigo: "",
        passwordNueva: "",
        passwordConfirmar: "",

        error: "",
        cargando: false,

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
                    headers: {
                        "Content-Type": "application/json"
                    },
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
                    headers: {
                        "Content-Type": "application/json"
                    },
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

            if (!/^\d{6}$/.test(this.codigo)) {
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
                    headers: {
                        "Content-Type": "application/json"
                    },
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
        // La respuesta no contiene JSON.
    }

    if (respuesta.status === 401) {
        return "Correo o contraseña incorrectos.";
    }

    if (respuesta.status === 403) {
        return "No tienes autorización para realizar esta operación.";
    }

    if (respuesta.status === 400) {
        return "No se pudo completar la solicitud.";
    }

    return "No se pudo completar la solicitud.";
}


function fechaLegible() {
    return new Date().toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}