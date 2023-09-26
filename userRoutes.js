// userRoutes.js
const express = require("express");
const router = express.Router();
const con = require("./db");
const { hashPassword, comparePasswords } = require("./bcryptUtils");
//const AWS = require('aws-sdk');
const s3 = require('./awsConfig');
const fs = require('fs');
const path = require('path');

function uploadImageToS3(userID, imageName, imageComp, callback) { // Subir imagen al bucket
  
  //const imageDecoded = Buffer.from(imageComp, 'base64'); // Decodifica la imagen Base64

  // Guarda la imagen decodificada como un archivo en el sistema de archivos local
  //const filePath = path.join(__dirname, 'temp', `${userID}_${imageName}`);
  //fs.writeFileSync(filePath, decodedImage);

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${userID}_${imageName}`, 
    //Body: fs.createReadStream(filePath),
  };

  s3.upload(params, (err, data) => {
    // Elimina el archivo temporal después de subirlo a S3
    //fs.unlinkSync(filePath);
    if (err) {
      console.error(err);
      callback(err);
    } else {
      console.log('Imagen cargada exitosamente:', data.Location);
      callback(null, data.Location); // Envía la URL de la imagen cargada
    }
  });
}

function uploadProfilePicToS3(name, profilePic, callback) { // Subir profilePic al bucket
  
  const imageDecoded = Buffer.from(profilePic.split(',')[1], 'base64'); // Decodifica la imagen Base64

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${name}_profilePic.jpg`, 
    ContentType: 'image/jpeg',
    Body: imageDecoded, // Decodifica la imagen Base64
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      callback(err);
    } else {
      console.log('Imagen cargada exitosamente:', data.Location);
      callback(null, data.Location); // Envía la URL de la imagen cargada
    }
  });
}


// Obtener URL temporal de la imagen
function getProfilePicFromS3(keyImageUrl) { 

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${keyImageUrl}`,
  };

  const presignedUrl = s3.getSignedUrl('getObject', params);
  console.log(presignedUrl);

  return presignedUrl;
}

router.post("/registerAccount", (request, response) => {
  const { name, email, password, profilePic } = request.body;

  // Hash de la contraseña
  hashPassword(password, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al registrar el usuario" });
    } else {
      uploadProfilePicToS3(name, profilePic, (err, imageUrl) => {
        if (err) {
          console.error(err);
          response.status(500).json({ message: "Error al cargar la imagen en S3" });
        } else {
          response.status(200).json({ message: "Imagen cargada exitosamente", imageUrl });
          const partesURL = imageUrl.split('/');
          const keyImageUrl = partesURL[partesURL.length - 1]; // Última parte de la url
          const post = { username: name, email, password: hashedPassword, profilePic: keyImageUrl };
        
          const sql = "INSERT INTO users SET ?";
          con.query(sql, post, (err) => {
            if (err) {
              console.error(err);
              response.status(500).json({ message: "Error al registrar el usuario" });
            } else {
              response.status(201).json({ message: "Usuario registrado correctamente" });
            }
          });
        }
      });
    }
  });
});

// Inicio de sesión de usuario
router.post("/loginAccount", (request, response) => {
  const { email, password } = request.body;

  // Obtener datos de usuario por correo electrónico
  const findUserQuery = "SELECT username, password, profilePic FROM users WHERE email = ?";
  con.query(findUserQuery, [email], (err, results) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error en la base de datos" });
    } else if (results.length === 0) {
      response.status(404).json({ message: "Usuario no encontrado" });
    } else {
      const storedPassword = results[0].password;

      // Comparar la contraseña ingresada con el hash almacenado
      comparePasswords(password, storedPassword, (compareErr, passwordsMatch) => {
        if (compareErr) {
          console.error(compareErr);
          response.status(500).json({ message: "Error al comparar contraseñas" });
        } else if (passwordsMatch) {
          const { username, profilePic } = results[0];
          
          const presignedUrl = getProfilePicFromS3(profilePic);

          response.status(200).json({ message: "Usuario logueado correctamente", username, profilePic: presignedUrl });
        } else {
          response.status(401).json({ message: "Contraseña incorrecta" });
        }
      });
    }
  });
});

function getUserID(username, callback) {
  const findIDQuery = "SELECT id FROM users WHERE username = ?"

  con.query(findIDQuery, [username], (err, results) => {
    if (err) {
      console.error(err);
      callback(err, null); // Pasas error al callback
    } else {
      if (results.length > 0) {
        const userID = results[0].id;
        callback(null, userID); // Pasas el userID al callback
      } else {
        callback(new Error("Usuario no encontrado"), null);
      }
    }
  });
}

router.post("/submitImage", (request, response) => {
  const { imageName, imageComp, username } = request.body;
  const points = 0;

  getUserID(username, (err, userID) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al obtener el ID de usuario" });
    } else {
      uploadImageToS3(userID, imageName, imageComp, (err, imageUrl) => {
        if (err) {
          console.error(err);
          response.status(500).json({ message: "Error al cargar la imagen en S3" });
        } else {
          response.status(200).json({ message: "Imagen cargada exitosamente", imageUrl });
          const post = { imageRoute: imageUrl, imageDesc: imageName, userID, points };
          const submitImageQuery = "INSERT INTO competitors SET ?";
          con.query(submitImageQuery, post, (err) => {
            if (err) {
              console.error(err);
              response.status(500).json({ message: "Error al enviar imagen" });
            } else {
              response.status(201).json({ message: "Foto enviada" });
            }
          });
        }
      });
    }
  });
});

module.exports = router;

/*const post = { imageRoute: imageComp, imageDesc: imageName, userID, points };
const submitImageQuery = "INSERT INTO competitors SET ?";
con.query(submitImageQuery, post, (err) => {
  if (err) {
    console.error(err);
    response.status(500).json({ message: "Error al enviar imagen" });
  } else {
    response.status(201).json({ message: "Foto enviada" });
  }
});*/