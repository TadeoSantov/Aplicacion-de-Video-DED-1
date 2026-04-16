import rateLimit from "express-rate-limit";

export const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, mensaje: "Demasiados intentos. Intenta de nuevo más tarde." },
});

export const limitadorGeneral = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
});
