const express = require("express");
const axios = require("axios");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const client = new MongoClient("mongodb://mongo:27017");
let db, emprunts;

let counter = 1;

const LIVRE_SERVICE = "http://livre-service:3001";
const MEMBRE_SERVICE = "http://membre-service:3002";

async function start() {
  await client.connect();
  db = client.db("bibliotheque_emprunts");
  emprunts = db.collection("emprunts");
  console.log("Emprunt-service connecté");
}

start();

// GET ALL
app.get("/emprunts", async (req, res) => {
  res.json(await emprunts.find().toArray());
});

// EN COURS
app.get("/emprunts/en-cours", async (req, res) => {
  res.json(await emprunts.find({ retourne: false }).toArray());
});

// PAR MEMBRE
app.get("/emprunts/membre/:id", async (req, res) => {
  res.json(await emprunts.find({ idMembre: +req.params.id }).toArray());
});

// CREATE EMPREUNT
app.post("/emprunts", async (req, res) => {
  const { idMembre, idLivre } = req.body;

  // 1 membre
  const membre = await axios.get(`${MEMBRE_SERVICE}/membres/${idMembre}`);
  if (!membre.data.actif)
    return res.status(400).send("Membre inactif");

  // 2 livre
  const livre = await axios.get(`${LIVRE_SERVICE}/livres/${idLivre}`);
  if (!livre.data.disponible)
    return res.status(400).send("Livre non disponible");

  // 3 create emprunt
  const emprunt = {
    id: counter++,
    idMembre,
    idLivre,
    nomMembre: membre.data.nom,
    titreLivre: livre.data.titre,
    dateEmprunt: new Date().toISOString(),
    dateRetour: null,
    retourne: false,
  };

  await emprunts.insertOne(emprunt);

  // 4 update livre
  await axios.patch(
    `${LIVRE_SERVICE}/livres/${idLivre}/disponibilite`,
    { disponible: false }
  );

  res.status(201).json(emprunt);
});

// RETOUR LIVRE
app.patch("/emprunts/:id/retour", async (req, res) => {
  const emprunt = await emprunts.findOne({ id: +req.params.id });
  if (!emprunt) return res.status(404).send("Introuvable");
  if (emprunt.retourne) return res.status(400).send("Déjà retourné");

  await emprunts.updateOne(
    { id: emprunt.id },
    {
      $set: {
        retourne: true,
        dateRetour: new Date().toISOString(),
      },
    }
  );

  await axios.patch(
    `${LIVRE_SERVICE}/livres/${emprunt.idLivre}/disponibilite`,
    { disponible: true }
  );

  res.send("Livre retourné");
});

// DELETE
app.delete("/emprunts/:id", async (req, res) => {
  await emprunts.deleteOne({ id: +req.params.id });
  res.send("Supprimé");
});

app.listen(3003, () =>
  console.log("Emprunt-service sur port 3003")
);