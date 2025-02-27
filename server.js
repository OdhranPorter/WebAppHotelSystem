const express = require('express');
const path = require('path');
const app = express();

// Serve HTML pages dynamically
app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'views', `${page}.html`);
    
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).send("Page not found!");
        }
    });
});

// Serve JS files securely
app.get('/js/:file', (req, res) => {
    res.sendFile(path.join(__dirname, 'secure/js', req.params.file));
});

// Serve CSS files securely
app.get('/css/:file', (req, res) => {
    res.sendFile(path.join(__dirname, 'secure/css', req.params.file));
});

// Serve image files securely
app.get('/images/:file', (req, res) => {
    res.sendFile(path.join(__dirname, 'secure/images', req.params.file));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://hotel-booking-3aad3-default-rtdb.europe-west1.firebasedatabase.app/"
});
