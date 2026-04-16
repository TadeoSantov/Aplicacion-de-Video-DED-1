import express from "express";
import cors from "cors";
import helmet from "helmet";

import UsuarioRutas from "./Rutas/Usuario_Rutas.js";
import FacultadRutas from "./Rutas/Facultades_Rutas.js";
import CarreraRutas from "./Rutas/Carreras_Rutas.js";
import UaRutas from "./Rutas/Uas_Rutas.js";
import VideosRutas from "./Rutas/Videos_Rutas.js";
import PalabrasRuta from "./Rutas/Palabras_Rutas.js";
import SesionesRuta from "./Rutas/Sesion_Rutas.js";

import { limitadorGeneral, limitadorLogin } from "./CapaServicio/rateLimit.service.js";

const app = express();

const origenesPermitidos = (process.env.CORS_ORIGINS ?? "http://127.0.0.1:8080")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(helmet());
app.use(cors({ origin: origenesPermitidos, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(limitadorGeneral);

app.post("/usuarios/login", limitadorLogin);
app.post("/usuarios/validaradmin", limitadorLogin);

app.use("/palabras", PalabrasRuta);
app.use("/usuarios", UsuarioRutas);
app.use("/facultades", FacultadRutas);
app.use("/carreras", CarreraRutas);
app.use("/UAs", UaRutas);
app.use("/videos", VideosRutas);
app.use("/sessions", SesionesRuta);

app.use((req, res) => {
    res.status(404).json({ success: false, mensaje: "Recurso no encontrado" });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status ?? 500).json({ success: false, mensaje: "Error interno del servidor" });
});

export default app;
