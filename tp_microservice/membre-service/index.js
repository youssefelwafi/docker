const express = require("express");
const { MongoClient } = require("mongodb");

const app = express();
app.use(express.json());

const client = new MongoClient("mongodb://mongo:27017");
let db, membres;

let counter = 1;

async function start() {
  await client.connect();
  db = client.db("bibliotheque_membres");
  membres = db.collection("membres");
  console.log("Membre-service connecté");
}

start();

// GET ALL
app.get("/membres", async (req, res) => {
  res.json(await membres.find().toArray());
});

// GET BY ID
app.get("/membres/:id", async (req, res) => {
  const m = await membres.findOne({ id: +req.params.id });
  if (!m) return res.status(404).send("Membre introuvable");
  res.json(m);
});

// CREATE (email unique)
app.post("/membres", async (req, res) => {
  const exists = await membres.findOne({ email: req.body.email });
  if (exists) return res.status(400).send("Email déjà utilisé");

  const membre = {
    id: counter++,
    nom: req.body.nom,
    email: req.body.email,
    actif: true,
  };

  await membres.insertOne(membre);
  res.status(201).json(membre);
});

// UPDATE FULL
app.put("/membres/:id", async (req, res) => {
  const result = await membres.replaceOne(
    { id: +req.params.id },
    req.body
  );

  if (result.matchedCount === 0)
    return res.status(404).send("Membre introuvable");

  res.send("Mis à jour");
});

// PATCH ACTIF
app.patch("/membres/:id/statut", async (req, res) => {
  await membres.updateOne(
    { id: +req.params.id },
    { $set: { actif: req.body.actif } }
  );
  res.send("OK");
});

// DELETE
app.delete("/membres/:id", async (req, res) => {
  await membres.deleteOne({ id: +req.params.id });
  res.send("Supprimé");
});

app.listen(3002, () =>
  console.log("Membre-service sur port 3002")
);