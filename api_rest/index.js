const { MongoClient } = require("mongodb");

// Avant (local dev)
// const client = new MongoClient("mongodb://127.0.0.1:27017");

// Après (Docker / production / compose)
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";

const client = new MongoClient(MONGO_URL);
