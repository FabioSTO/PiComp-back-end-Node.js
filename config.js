require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || "<port>", //Puerto del servidor
  dbConfig: {
    host: process.env.DB_HOST || "<host>",
    user: process.env.DB_USER || "<user>",
    password: process.env.DB_PASSWORD || "<contraseña>",
    database: process.env.DB_DATABASE || "<database>",
  },
};