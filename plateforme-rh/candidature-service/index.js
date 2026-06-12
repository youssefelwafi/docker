const express = require("express");
const axios = require("axios");
const amqp = require("amqplib");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json());
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const OFFRE_SERVICE = process.env.OFFRE_SERVICE_URL || "http://localhost:3001";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const client = new MongoClient(MONGO_URL);
let db;
let channel;
async function connecterRabbitMQ() {
  try {
    // Connexion au serveur RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    // channel est stocke en variable globale
    // pour pouvoir l'utiliser dans la fonction envoyerMessage()
    channel = await connection.createChannel();
    // Declarer la meme file que le consommateur (offre-service)
    // Si la file existe deja, RabbitMQ verifie juste qu'elle a les memes options
    await channel.assertQueue("nouvelle_candidature", { durable: true });
    console.log("candidature-service connecte a RabbitMQ");
  } catch (err) {
    console.log("RabbitMQ pas pret, retry dans 5s...");
    // Pattern de retry : si RabbitMQ n'est pas encore demarre
    // on reessaie toutes les 5 secondes jusqu'a reussir
    setTimeout(connecterRabbitMQ, 5000);
  }
}
function envoyerMessage(nomFile, data) {
  // channel.sendToQueue() : envoyer un message dans une file
  channel.sendToQueue(
    nomFile, // nom de la file cible
    Buffer.from(JSON.stringify(data)), // message converti en Buffer binaire
    // RabbitMQ transporte des bytes, pas du JSON
    { persistent: true }, // message sauvegarde sur disque
    // survit au redemarrage de RabbitMQ
  );
  console.log(`[RABBITMQ] Message envoye dans ${nomFile} :`, data);
}
async function demarrer() {
  await client.connect();
  db = client.db("rh_candidatures");
  console.log("candidature-service connecte a MongoDB");
  await connecterRabbitMQ();
  // GET toutes les candidatures
  app.get("/candidatures", async (req, res) => {
    try {
      const candidatures = await db
        .collection("candidatures")
        .find({})
        .toArray();
      res.status(200).json(candidatures);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

  // GET une candidature
  // GET une candidature
  app.get("/candidatures/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const candidature = await db.collection("candidatures").findOne({ id });
      if (!candidature)
        return res.status(404).json({ message: "Candidature non trouvee" });
      res.status(200).json(candidature);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // GET candidatures d'une offre
  app.get("/candidatures/offre/:idOffre", async (req, res) => {
    try {
      const idOffre = parseInt(req.params.idOffre);
      const candidatures = await db
        .collection("candidatures")
        .find({ idOffre })
        .toArray();
      res.status(200).json(candidatures);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // POST postuler a une offre
  app.post("/candidatures", async (req, res) => {
    try {
      const { idOffre, nomCandidat, email, cv } = req.body;
      // 1 - Verifier que l'offre existe et est ouverte (HTTP)
      const offreRes = await axios.get(`${OFFRE_SERVICE}/offres/${idOffre}`);
      const offre = offreRes.data;
      if (offre.statut !== "ouverte") {
        return res.status(400).json({ message: "Offre fermee" });
      }
      // 2 - Sauvegarder la candidature const
      const tous = await db.collection("candidatures").find({}).toArray();
      const candidature = {
        id: tous.length > 0 ? Math.max(...tous.map((c) => c.id)) + 1 : 1,
        idOffre,
        titreOffre: offre.titre,
        nomCandidat,
        email,
        cv,
        datePostulation: new Date().toISOString(),
      };
      await db.collection("candidatures").insertOne(candidature);
      // 3 - Envoyer message RabbitMQ → offre-service
      // On n'attend PAS de reponse — c'est la difference cle avec axios
      // Le message est depose dans la file et on continue immediatement
      // offre-service lira ce message quand il sera pret
      envoyerMessage("nouvelle_candidature", {
        idOffre,
        nomCandidat,
        email,
        action: "NOUVELLE_CANDIDATURE", // type d'evenement
      });
      // 4 - Reponse immediate au candidat
      // On ne sait pas encore si offre-service a traite le message
      // mais on repond quand meme — c'est l'asynchronisme
      res.status(201).json({
        message: "Candidature enregistree avec succes",
        candidature,
      });
    } catch (err) {
      if (err.response?.status === 404) {
        return res.status(404).json({ message: "Offre non trouvee" });
      }
      res.status(500).json({ message: err.message });
    }
  });
  app.listen(3002, () =>
    console.log("candidature-service demarre sur le port 3002"),
  );
}
demarrer();
