const express = require("express");
const amqp = require("amqplib");
const { MongoClient } = require("mongodb");
const app = express();
app.use(express.json());
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const client = new MongoClient(MONGO_URL);

let db;
async function ecouterRabbitMQ() {
  try {
    // amqp.connect() : etablit la connexion physique avec RabbitMQ
    // RABBITMQ_URL = 'amqp://localhost' en local
    const connection = await amqp.connect(RABBITMQ_URL);
    // createChannel() : ouvre un canal de communication sur la connexion
    // Un canal est une connexion virtuelle legere — on peut en avoir plusieurs
    const channel = await connection.createChannel();
    // assertQueue() : cree la file si elle n'existe pas, ou verifie qu'elle existe
    // durable: true = la file survit au redemarrage de RabbitMQ
    // IMPORTANT : les deux services doivent declarer la meme file avec les memes options
    await channel.assertQueue("nouvelle_candidature", { durable: true });
    // prefetch(1) : traiter un seul message a la fois
    // Sans prefetch, RabbitMQ enverrait tous les messages d'un coup
    channel.prefetch(1);
    console.log("offre-service ecoute nouvelle_candidature...");
    // channel.consume() : s'abonner a la file et definir le callback
    // Le callback est appele automatiquement a chaque nouveau message
    channel.consume("nouvelle_candidature", async (msg) => {
      if (!msg) return;
      // msg.content est un Buffer — on le convertit en JSON
      const data = JSON.parse(msg.content.toString());
      // data = { idOffre: 1, nomCandidat: 'Alice', action: 'NOUVELLE_CANDIDATURE' }
      console.log("[RABBITMQ] Message recu :", data);
      try {
        // Traitement metier : incrementer nbCandidatures
        // $inc est un operateur MongoDB qui incremente un champ

        await db
          .collection("offres")
          .updateOne({ id: data.idOffre }, { $inc: { nbCandidatures: 1 } });
        console.log(`Offre ${data.idOffre} : nbCandidatures + 1`);
        // channel.ack(msg) : confirmer a RabbitMQ que le message est traite
        // Sans ack : RabbitMQ garde le message et le renvoie au prochain consumer
        channel.ack(msg);
      } catch (err) {
        console.log("Erreur:", err.message);
        // channel.nack(msg, false, true) : rejeter le message
        // false = ne pas requeue les autres messages
        // true = remettre CE message en file pour reessayer
        channel.nack(msg, false, true);
      }
    });
  } catch (err) {
    // Si RabbitMQ n'est pas encore pret (ex: au demarrage)
    // On reessaie automatiquement toutes les 5 secondes
    console.log("RabbitMQ pas pret, retry dans 5s...");
    setTimeout(ecouterRabbitMQ, 5000);
  }
}
async function demarrer() {
  await client.connect();
  db = client.db("rh_offres");
  console.log("offre-service connecte a MongoDB");
  await ecouterRabbitMQ();
  // GET toutes les offres
  app.get("/offres", async (req, res) => {
    try {
      const offres = await db.collection("offres").find({}).toArray();
      res.status(200).json(offres);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // GET une offre
  app.get("/offres/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const offre = await db.collection("offres").findOne({ id });
      if (!offre) return res.status(404).json({ message: "Offre non trouvee" });
      res.status(200).json(offre);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // POST creer une offre
  app.post("/offres", async (req, res) => {
    try {
      const tous = await db.collection("offres").find({}).toArray();
      const offre = {
        id: tous.length > 0 ? Math.max(...tous.map((o) => o.id)) + 1 : 1,
        titre: req.body.titre,
        description: req.body.description,
        statut: req.body.statut || "ouverte",
        nbCandidatures: 0,
      };
      await db.collection("offres").insertOne(offre);
      res.status(201).json(offre);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // PUT modifier une offre
  app.put("/offres/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db
        .collection("offres")
        .replaceOne({ id }, { id, ...req.body });
      if (result.matchedCount === 0)
        return res.status(404).json({ message: "Offre non trouvee" });
      res.status(200).json({ id, ...req.body });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  // DELETE supprimer une offre
  app.delete("/offres/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await db.collection("offres").deleteOne({ id });
      if (result.deletedCount === 0)
        return res.status(404).json({ message: "Offre non trouvee" });
      res.status(200).json({ message: `Offre ${id} supprimee` });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  app.listen(3001, () => console.log("offre-service demarre sur le port 3001"));
}
demarrer();
