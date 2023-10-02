const s3 = require('./awsConfig');
const con = require("./db");

function uploadImageToS3(userID, imageName, imageComp, callback) { // Subir imagen al bucket
  
  const imageExtension = imageComp.split('/')[1].split(';')[0]; // Obtiene la extensión de la imagen a partir de la base64
  const imageDecoded = Buffer.from(imageComp.split(',')[1], 'base64'); // Decodifica la imagen Base64
  const imageNameUnderscored = imageName.replaceAll(" ", "_"); // Cambia los espacios por "_" para formalizar el nombre de la foto

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${userID}_${imageNameUnderscored}.${imageExtension}`, 
    ContentType: 'image/*',
    Body: imageDecoded,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      callback(err,null);
    } else {
      console.log('Imagen cargada exitosamente:', data.Location);
      callback(null, data.Location); // Envía la URL de la imagen cargada
    }
  });
}

function uploadProfilePicToS3(name, profilePic, callback) { // Subir profilePic al bucket
  
  const imageExtension = profilePic.split('/')[1].split(';')[0]; // Obtiene la extensión de la imagen a partir de la base64
  const imageDecoded = Buffer.from(profilePic.split(',')[1], 'base64'); // Decodifica la imagen Base64

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${name}_profilePic.${imageExtension}`, 
    ContentType: 'image/*',
    Body: imageDecoded, // Decodifica la imagen Base64
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error(err);
      callback(err, null);
    } else {
      console.log('Imagen cargada exitosamente:', data.Location);
      callback(null, data.Location); // Envía la URL de la imagen cargada
    }
  });
}


// Obtener URL temporal de la imagen para mostrarla en el login

function getProfilePicFromS3(keyImageUrl) { 

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${keyImageUrl}`,
  };

  const presignedUrl = s3.getSignedUrl('getObject', params);
  console.log(presignedUrl);

  return presignedUrl;
}

// Obtener URL temporal de la imagen para mostrarla en el login

function getImageFromS3(keyImageUrl) { 

  const params = {
    Bucket: 'picomp-bucket',
    Key: `${keyImageUrl}`,
  };

  const presignedUrl = s3.getSignedUrl('getObject', params);
  console.log(presignedUrl);

  return presignedUrl;
}

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

// Actualizar estado de submitted a True
function updateSubmittedFlagTrue (userID) {
  const updateSubmittedFlag = "UPDATE users SET submitted = TRUE WHERE id = ?";
  
  con.query(updateSubmittedFlag, userID, (err) => {
    if (err) {
      console.error(err);
    } else {
      console.error("Campo submitted actualizado");
    }
  });
}


module.exports = {
  uploadImageToS3,
  uploadProfilePicToS3,
  getImageFromS3,
  getProfilePicFromS3,
  getUserID,
  updateSubmittedFlagTrue,
};