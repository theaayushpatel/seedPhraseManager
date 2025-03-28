const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const crypto = require('crypto');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Updated MongoDB connection
mongoose.connect('mongodb://localhost:27017/seedPhraseManager')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

// MongoDB Schema and Model
const walletSchema = new mongoose.Schema({
    walletName: String,
    encryptedSeedPhrase: String,
});

const Wallet = mongoose.model('Wallet', walletSchema);

// AES Encryption Function
// AES Encryption Function
function encryptSeedPhrase(seedPhrase, encryptionPassword) {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(encryptionPassword).digest(); // Generate a 256-bit key
    const iv = crypto.randomBytes(16); // Generate a random initialization vector (IV)

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(seedPhrase, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combine IV and encrypted data for storage
    return iv.toString('hex') + ':' + encrypted;
}

function decryptSeedPhrase(encryptedSeedPhrase, encryptionPassword) {
    const algorithm = 'aes-256-cbc';
    const [ivHex, encrypted] = encryptedSeedPhrase.split(':'); // Split IV and encrypted data
    const key = crypto.createHash('sha256').update(encryptionPassword).digest(); // Generate a 256-bit key
    const iv = Buffer.from(ivHex, 'hex'); // Convert IV back to a buffer

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

app.get('/api/wallets', async (req, res) => {
    try {
        const wallets = await Wallet.find({}, 'walletName encryptedSeedPhrase'); // Fetch walletName and encryptedSeedPhrase
        res.json(wallets);
    } catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API Endpoint to handle form submission
app.post('/addWallet', async (req, res) => {
    const { walletName, seedPhrase, encryptionPassword } = req.body;

    if (!walletName || !seedPhrase || !encryptionPassword) {
        return res.status(400).send('All fields are required.');
    }

    try {
        // Encrypt the seed phrase
        const encryptedSeedPhrase = encryptSeedPhrase(seedPhrase, encryptionPassword);

        // Save to MongoDB
        const newWallet = new Wallet({ walletName, encryptedSeedPhrase });
        await newWallet.save();

        res.status(200).send('Wallet added successfully!');
    } catch (error) {
        console.error('Error saving wallet:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Serve static files (e.g., addWallet.html)
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});