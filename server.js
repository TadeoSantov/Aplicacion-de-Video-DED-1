import "dotenv/config";
import app from "./app.js";

const PORT = Number.parseInt(process.env.PORT ?? "3002", 10);

app.listen(PORT, () => {
    console.log(`Server funcionando en el puerto ${PORT}`);
});
