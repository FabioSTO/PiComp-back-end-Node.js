const express = require("express");
const router = express.Router();
const con = require("./db");
const { hashPassword, comparePasswords } = require("./bcryptUtils");
const s3Utils = require('./s3Utils');
const imageDistributionUtils = require('./tasks/imageDistributionUtils'); 


// Muestra imágenes para votar
router.get("/showImagesToVote", async (request, response) => {
  try {
    // Distribución a las 00:00 para repartir imágenes
  const allImagesDistributed = await imageDistributionUtils.distributeImages();
  console.log(allImagesDistributed);
  
  if (allImagesDistributed) {
    response.status(200).json({ allImagesDistributed: allImagesDistributed });
  } else {
    response.status(500).json({ error: "La distribución de imágenes no se ha completado aún." });
  }
  } catch (error) {
    response.status(500).json({ error: "Error en la distribución de imágenes." });
  }

});


// Registro de nuevo usuario
router.post("/registerAccount", (request, response) => {
  const { name, email, password, profilePic } = request.body;

  // Hash de la contraseña
  hashPassword(password, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al registrar el usuario" });
    } else {
      s3Utils.uploadProfilePicToS3(name, profilePic, (err, imageUrl) => {
        if (err) {
          console.error(err);
          response.status(500).json({ message: "Error al cargar la imagen en S3" });
        } else {
          //response.status(200).json({ message: "Imagen cargada exitosamente", imageUrl }); // Comentado porque express no permite devolver 2 respuestas
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
  const findUserQuery = "SELECT id, username, password, profilePic, email, submitted, voted FROM users WHERE email = ?";
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
          const { id, username, profilePic, email, submitted, voted } = results[0];
          
          const presignedUrl = s3Utils.getProfilePicFromS3(profilePic);

          response.status(200).json({ message: "Usuario logueado correctamente", id, username, profilePic: presignedUrl, email, submitted, voted });
        } else {
          response.status(401).json({ message: "Contraseña incorrecta" });
        }
      });
    }
  });
});

// Usuario submitea una imagen
router.post("/submitImage", (request, response) => {
  const { imageName, imageComp, username } = request.body;
  const points = 0;

  // Obtiene la fecha actual en el formato 'YYYY-MM-DD'
  const currDate = new Date();
  const date = currDate.toISOString().slice(0, 10);

  s3Utils.getUserID(username, (err, userID) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al obtener el ID de usuario" });
    } else {
      s3Utils.uploadImageToS3(userID, imageName, imageComp, (err, imageUrl) => {
        if (err) {
          console.error(err);
          response.status(500).json({ message: "Error al cargar la imagen en S3" });
        } else {
          const post = { imageRoute: imageUrl, imageDesc: imageName, userID, points, date };
          const submitImageQuery = "INSERT INTO competitors SET ?";
          con.query(submitImageQuery, post, (err) => {
            if (err) {
              console.error(err);
              response.status(500).json({ message: "Error al enviar imagen" });
            } else {
              response.status(201).json({ message: "Foto enviada" });
            }
          });
          s3Utils.updateSubmittedFlagTrue(userID);
        }
      });
    }
  });
});

module.exports = router;