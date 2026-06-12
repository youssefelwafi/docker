const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const client = new MongoClient("mongodb://mongo:27017");
let db, livres;

let counter = 1;

async function start() {
  await client.connect();
  db = client.db("bibliotheque_livres");
  livres = db.collection("livres");
  console.log("Livre-service connecté");
}

start();

// GET ALL
app.get("/livres", async (req, res) => {
  res.json(await livres.find().toArray());
});

// GET BY ID
app.get("/livres/:id", async (req, res) => {
  const livre = await livres.findOne({ id: +req.params.id });
  if (!livre) return res.status(404).send("Livre introuvable");
  res.json(livre);
});

// DISPONIBLES
app.get("/livres/disponibles", async (req, res) => {
  res.json(await livres.find({ disponible: true }).toArray());
});

// CREATE
app.post("/livres", async (req, res) => {
  const livre = {
    id: counter++,
    titre: req.body.titre,
    auteur: req.body.auteur,
    isbn: req.body.isbn,
    disponible: true,
  };

  await livres.insertOne(livre);
  res.status(201).json(livre);
});

// UPDATE FULL
app.put("/livres/:id", async (req, res) => {
  const result = await livres.replaceOne(
    { id: +req.params.id },
    req.body
  );

  if (result.matchedCount === 0)
    return res.status(404).send("Livre introuvable");

  res.send("Mis à jour");
});

// PATCH DISPONIBILITE
app.patch("/livres/:id/disponibilite", async (req, res) => {
  await livres.updateOne(
    { id: +req.params.id },
    { $set: { disponible: req.body.disponible } }
  );
  res.send("OK");
});

// DELETE
app.delete("/livres/:id", async (req, res) => {
  await livres.deleteOne({ id: +req.params.id });
  res.send("Supprimé");
});

app.listen(3001, () =>
  console.log("Livre-service sur port 3001")
);