const cron = require('node-cron');
const con = require("../db");
const s3Utils = require('../s3Utils');

async function distributeImages() {

  return new Promise((resolve, reject) => {   // Porque no dejaba acabar la query el router bobi

    // Obtiene la fecha de ayer en el formato 'YYYY-MM-DD'
    const probando = new Date();
    probando.setDate(probando.getDate() - 8);
    
    const yesterDate = new Date();
    yesterDate.setDate(yesterDate.getDate() - 1);
    const yesterDateFormatted = probando.toISOString().slice(0, 10);

    const countCompetitorsQuery = "SELECT COUNT(*) as count FROM competitors WHERE date = ?;"

    con.query(countCompetitorsQuery, [yesterDateFormatted], (err, resultados) => { // Contamos el total de participantes
      if (err) {
        console.error(err);
      } else {
        const totalImages = resultados[0].count;
        console.log(totalImages);
        if (totalImages <= 11) {
          
          const getUserImagePairs = "SELECT userID, imageRoute FROM competitors WHERE date = ?;"
          con.query(getUserImagePairs, [yesterDateFormatted], (err, results) => { // Obtenemos par imagen-usuario

            if (err) {
              console.error(err);
              reject(err);
            } else {
              
              const userImagePairs = [];

              for (const usuarioRow of results) { 
                for (const imagenRow of results) {
                  const usuario = usuarioRow.userID;
                  const image = imagenRow.imageRoute;
                  const imageSplit = image.split('/');
                  const imagen = imageSplit[imageSplit.length - 1];
                  
                  if (usuario == getFirstPartOfId(imagen)) { // Descartar aquella imagen que pertenezca al propio usuario
                    continue;
                  } else {
                    const presignedUrl = s3Utils.getImageFromS3(imagen);
                    userImagePairs.push({ usuario, imagen: presignedUrl });
                  }                
                }
              }
              resolve(userImagePairs);
            }
          });
        }
      }
    });
  });
}

function getFirstPartOfId(imagen) {
  const imagenSplitted = imagen.split('/');
  const keyImageName = imagenSplitted[imagenSplitted.length - 1]; // Última parte de la url (el nombre de la imagen)
  const idFromImageSplitted = keyImageName.split('_');
  const idFromImage = idFromImageSplitted[0];
  return idFromImage;
}


//setTimeout(distributeImages, 5 * 1000);

// La distribución de imágenes para votar se realiza cada día a las 00:00
function imageDistribution() {
  cron.schedule('0 0 * * *', () => {
    console.log(userImagePairs);
  });
  // Para ejecutarlo cada 5 min  
  //cron.schedule('*/5 * * * *', () => {
  //});
}


module.exports = { distributeImages, };