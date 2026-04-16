import * as UsuarioModelo from "../Modelos/Modelo_Usuario.js";
import {
    validarPoliticaPassword,
    hashPassword,
    compararPassword,
    compararPasswordLegado,
    esHash,
} from "../CapaServicio/seguridad.service.js";

function sanitizarUsuario(usuario) {
    if (!usuario) return usuario;
    const { password, ...resto } = usuario;
    return resto;
}

async function verificarYMigrar(passwordPlano, usuario) {
    if (!usuario?.password) return false;

    if (esHash(usuario.password)) {
        return compararPassword(passwordPlano, usuario.password);
    }

    const coincide = compararPasswordLegado(passwordPlano, usuario.password);
    if (coincide) {
        const nuevoHash = await hashPassword(passwordPlano);
        await UsuarioModelo.Actualizar(usuario.id, { password: nuevoHash });
    }
    return coincide;
}

export const ValidarUsuario = async (req, res) => {
    const { nombre, password } = req.body ?? {};
    if (!nombre || !password) {
        return res.status(400).json({ success: false, mensaje: "Credenciales incompletas" });
    }

    const usuarioEcontrado = await UsuarioModelo.obtenerPorNombre(nombre);
    if (!usuarioEcontrado) {
        return res.status(401).json({ success: false, mensaje: "Usuario no encontrado" });
    }
    if (usuarioEcontrado.baja) {
        return res.status(401).json({ success: false, mensaje: "Usuario desactivado, Contacte a su administrador" });
    }

    const passwordMatch = await verificarYMigrar(password, usuarioEcontrado);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, mensaje: "Contraseña incorrecta" });
    }

    return res.status(200).json({
        success: true,
        mensaje: "Login exitoso",
        usuarioEcontrado: {
            id: usuarioEcontrado.id,
            nombre: usuarioEcontrado.nombre_de_usuario,
            facultad: usuarioEcontrado.facultad_id,
            facultadnombre: usuarioEcontrado.facultad?.nombre ?? null,
            admin: usuarioEcontrado.admin,
        },
    });
};

export const ValidarAdmin = async (req, res) => {
    const { contra } = req.body ?? {};
    if (!contra) {
        return res.status(400).json({ success: false });
    }

    const admin = await UsuarioModelo.TraerAdmin();
    if (!admin) {
        return res.status(401).json({ success: false });
    }

    const passwordMatch = await verificarYMigrar(contra, admin);
    if (!passwordMatch) {
        return res.status(401).json({ success: false });
    }

    return res.status(200).json({ success: true });
};

export const crearUsuario = async (req, res) => {
    const { nombre, password, facultad } = req.body ?? {};

    if (!nombre || !password || !facultad) {
        return res.status(400).json({ success: false, mensaje: "Datos incompletos" });
    }

    const politica = validarPoliticaPassword(password);
    if (!politica.valido) {
        return res.status(400).json({ success: false, mensaje: politica.mensaje });
    }

    const usuarioEcontrado = await UsuarioModelo.obtenerPorNombre(nombre);
    if (usuarioEcontrado) {
        return res.status(409).json({ success: false, mensaje: "Ya existe un usuario con ese nombre" });
    }

    const usuarios = await UsuarioModelo.Count(facultad);
    if (usuarios > 0) {
        return res.status(409).json({ success: false, mensaje: "Ya existe un usuario asignado a esa facultad" });
    }

    const hashedPassword = await hashPassword(password);

    const nuevoUsuario = await UsuarioModelo.crearUsuario({
        facultad: { connect: { id: facultad } },
        nombre_de_usuario: nombre,
        password: hashedPassword,
        admin: false,
    });

    return res.status(201).json({
        success: true,
        mensaje: "Usuario creado con exito",
        nuevoUsuario: {
            id: nuevoUsuario.id,
            nombre_de_usuario: nuevoUsuario.nombre_de_usuario,
            facultad: nuevoUsuario.facultad_id,
            admin: nuevoUsuario.admin,
        },
    });
};

export const ActualizarUsuario = async (req, res) => {
    const id = req.body?.id;
    const data = req.body?.data;

    if (!id || !data) {
        return res.status(400).json({ success: false, mensaje: "Datos incompletos" });
    }

    if (data.nombre_de_usuario) {
        const existente = await UsuarioModelo.obtenerPorNombre(data.nombre_de_usuario);
        if (existente && existente.id !== id) {
            return res.status(409).json({ success: false, mensaje: "Ya existe un usuario con ese nombre" });
        }
    }

    if (data.password) {
        const politica = validarPoliticaPassword(data.password);
        if (!politica.valido) {
            return res.status(400).json({ success: false, mensaje: politica.mensaje });
        }
        data.password = await hashPassword(data.password);
    }

    const Usuario = await UsuarioModelo.Actualizar(id, data);
    if (!Usuario) {
        return res.status(404).json({ success: false, message: "usuario no encontrado" });
    }

    return res.status(200).json({ success: true, usuario: sanitizarUsuario(Usuario) });
};

export const ObtenerPorId = async (req, res) => {
    const Usuario = await UsuarioModelo.obtenerUsuarioporid(req.body?.id);
    if (!Usuario) {
        return res.status(404).json({ success: false, message: "usuario no encontrado" });
    }
    return res.status(200).json({ success: true, usuario: sanitizarUsuario(Usuario) });
};

export const ObtenerTodos = async (req, res) => {
    const Usuarios = await UsuarioModelo.ObtenerTodos();
    return res.status(200).json({ success: true, usuarios: Usuarios });
};
