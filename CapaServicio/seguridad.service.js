import bcrypt from "bcrypt";

const ROUNDS = Number.parseInt(process.env.BCRYPT_ROUNDS ?? "12", 10);
const PEPPER = process.env.PASSWORD_PEPPER ?? "";
const HASH_PREFIX = "$2";

const politica = {
    longitudMinima: 8,
    longitudMaxima: 72,
};

export function validarPoliticaPassword(password) {
    if (typeof password !== "string") {
        return { valido: false, mensaje: "La contraseña es obligatoria" };
    }

    if (password.length < politica.longitudMinima) {
        return { valido: false, mensaje: `La contraseña debe tener al menos ${politica.longitudMinima} caracteres` };
    }

    if (password.length > politica.longitudMaxima) {
        return { valido: false, mensaje: `La contraseña no puede exceder ${politica.longitudMaxima} caracteres` };
    }

    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneNumero = /\d/.test(password);
    const tieneEspecial = /[^A-Za-z0-9]/.test(password);

    if (!(tieneMayuscula && tieneMinuscula && tieneNumero && tieneEspecial)) {
        return {
            valido: false,
            mensaje: "La contraseña debe incluir mayúsculas, minúsculas, números y un carácter especial",
        };
    }

    return { valido: true };
}

export function esHash(valor) {
    return typeof valor === "string" && valor.startsWith(HASH_PREFIX);
}

export function hashPassword(password) {
    return bcrypt.hash(password + PEPPER, ROUNDS);
}

export function compararPassword(password, hash) {
    return bcrypt.compare(password + PEPPER, hash);
}

export function compararPasswordLegado(password, valorAlmacenado) {
    return password === valorAlmacenado;
}
