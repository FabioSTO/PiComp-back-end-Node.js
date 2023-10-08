const con = require("../db");

function insertVote(imageRoute, userID, votedPoints, response) { 

  const splittedImageRoute = imageRoute.split('?');
  const normalImageRoute = splittedImageRoute[0]; // URL normal de la imagen

  const post = { imageRoute: normalImageRoute, userID, votedPoints};

  const voteImages = "INSERT INTO votes SET ?";

  con.query(voteImages, post, (err) => {
    if (err) {
      console.error(err);
      response.status(500).json({ message: "Error al votar imágenes" });
    } 
  });

}

module.exports = { insertVote, };