const AWS = require('aws-sdk');
const config = require("./config");

// Configura las credenciales de AWS (debes proporcionar tus propias credenciales)
AWS.config.update(config.awsConfig);

// Crea una instancia de S3
const s3 = new AWS.S3();

module.exports = s3;