const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = new sqlite3.Database('./database.db');

db.run(`
  CREATE TABLE IF NOT EXISTS utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom_utilisateur TEXT UNIQUE,
    mot_de_passe TEXT
  )
`);

app.use(express.static(path.join(__dirname, 'public')));

// Inscription
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run(`INSERT INTO utilisateurs (nom_utilisateur, mot_de_passe) VALUES (?, ?)`, [username, hashedPassword], function(err) {
            if (err) return res.status(400).json({ success: false, message: "Ce nom existe déjà !" });
            res.json({ success: true, message: "Compte créé ! Vous pouvez vous connecter." });
        });
    } catch {
        res.status(500).json({ success: false, message: "Erreur serveur." });
    }
});

// Connexion
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM utilisateurs WHERE nom_utilisateur = ?`, [username], async (err, user) => {
        if (!user) return res.status(400).json({ success: false, message: "Utilisateur introuvable." });
        
        const match = await bcrypt.compare(password, user.mot_de_passe);
        if (match) {
            res.json({ success: true, message: `Bienvenue ${user.nom_utilisateur} !` });
        } else {
            res.status(400).json({ success: false, message: "Mot de passe incorrect." });
        }
    });
});

app.listen(3000, () => console.log("🚀 Serveur BacMath lancé sur http://localhost:3000"));