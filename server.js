const express = require("express"); // Esto es common.js (modules y eso)
const config = require("./config");   // Esto es common.js (modules y eso)
const app = express ();
const cors = require("cors"); // Permitir que solicitudes crucen distintos orígenes
const bodyParser = require('body-parser');

// Conexión a Express

app.use(bodyParser.json({ limit: '10mb' })); // Para permitir fotos más grandes

app.use(express.json()); 

// Habilita CORS

app.use(cors());

// Servidor escuchando

app.listen(config.PORT, () => {
  console.log("Server Listening on PORT:", config.PORT);
});

module.exports = app;