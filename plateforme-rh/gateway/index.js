const express = require("express");
const axios = require("axios");
const app = express();
app.use(express.json());
const OFFRE_SERVICE = process.env.OFFRE_SERVICE_URL || "http://localhost:3001";
const CANDIDATURE_SERVICE =
  process.env.CANDIDATURE_SERVICE_URL || "http://localhost:3002";
// Offres
app.get("/offres", async (req, res) => {
  try {
    const r = await axios.get(`${OFFRE_SERVICE}/offres`);
    res.status(200).json(r.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.get("/offres/:id", async (req, res) => {
  try {
    const r = await axios.get(`${OFFRE_SERVICE}/offres/${req.params.id}`);
    res.status(200).json(r.data);
  } catch (err) {
    if (err.response?.status === 404)
      return res.status(404).json({ message: "Offre non trouvee" });
    res.status(500).json({ message: err.message });
  }
});
app.post("/offres", async (req, res) => {
  try {
    const r = await axios.post(`${OFFRE_SERVICE}/offres`, req.body);
    res.status(201).json(r.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.put("/offres/:id", async (req, res) => {
  try {
    const r = await axios.put(
      `${OFFRE_SERVICE}/offres/${req.params.id}`,
      req.body,
    );
    res.status(200).json(r.data);
  } catch (err) {
    if (err.response?.status === 404)
      return res.status(404).json({ message: "Offre non trouvee" });
    res.status(500).json({ message: err.message });
  }
});
app.delete("/offres/:id", async (req, res) => {
  try {
    const r = await axios.delete(`${OFFRE_SERVICE}/offres/${req.params.id}`);
    res.status(200).json(r.data);
  } catch (err) {
    if (err.response?.status === 404)
      return res.status(404).json({ message: "Offre non trouvee" });
    res.status(500).json({ message: err.message });
  }
});
// CANDIDATURES
app.get("/candidatures", async (req, res) => {
  try {
    const r = await axios.get(`${CANDIDATURE_SERVICE}/candidatures`);
    res.status(200).json(r.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
àapp.get("/candidatures/:id", async (req, res) => {
  try {
    const r = await axios.get(
      `${CANDIDATURE_SERVICE}/candidatures/${req.params.id}`,
    );
    res.status(200).json(r.data);
  } catch (err) {
    if (err.response?.status === 404)
      return res.status(404).json({ message: "Candidature non trouvee" });
    res.status(500).json({ message: err.message });
  }
});
app.get("/candidatures/offre/:id", async (req, res) => {
  try {
    const r = await axios.get(
      `${CANDIDATURE_SERVICE}/candidatures/offre/${req.params.id}`,
    );
    res.status(200).json(r.data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.post("/candidatures", async (req, res) => {
  try {
    const r = await axios.post(`${CANDIDATURE_SERVICE}/candidatures`, req.body);
    res.status(201).json(r.data);
  } catch (err) {
    if (err.response)
      return res.status(err.response.status).json(err.response.data);
    res.status(500).json({ message: err.message });
  }
});
app.listen(3000, () => console.log("Gateway demarre sur le port 3000"));
