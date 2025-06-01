const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const Web3 = require("web3");
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/seedPhraseManager')
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Error connecting to MongoDB:', error));

// MongoDB Schema and Models
const userSchema = new mongoose.Schema({
    username: String,
    userId: String,
    hashedMasterSeed: String
});

const walletSchema = new mongoose.Schema({
    walletName: String,
    encryptedSeedPhrase: String,
    userId: String
});

const User = mongoose.model('User', userSchema);
const Wallet = mongoose.model('Wallet', walletSchema);

// JWT Secret Key
const JWT_SECRET = 'yourSecretKey';

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).send('Access Denied');
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).send('Invalid Token');
        }
        req.user = user;
        next();
    });
}

// Helper function to hash the Master Seed Phrase
function hashMasterSeed(masterSeed) {
    return crypto.createHash('sha256').update(masterSeed).digest('hex');
}

// Register API Endpoint
app.post('/register', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists.');
        }

        // Generate Master Seed Phrase and User ID
        const masterSeed = generateMasterSeedPhrase();
        const hashedMasterSeed = hashMasterSeed(masterSeed); // Hash the Master Seed Phrase
        const userId = generateUserId();

        // Save the user to the database
        const newUser = new User({ username, userId, hashedMasterSeed });
        await newUser.save();

        // Return the Master Seed Phrase to the client
        res.status(201).json({ message: 'User registered successfully!', masterSeed });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Login API Endpoint
app.post('/login', async (req, res) => {
    const { masterSeed } = req.body;

    // Validate that the master seed is 12 words long
    if (!masterSeed || masterSeed.split(' ').length !== 12) {
        return res.status(400).send('Invalid master seed phrase. It must be 12 words long.');
    }

    try {
        // Hash the provided Master Seed Phrase
        const hashedMasterSeed = hashMasterSeed(masterSeed);

        // Check if the hashed master seed exists in the database
        const user = await User.findOne({ hashedMasterSeed });
        if (!user) {
            return res.status(401).send('Invalid master seed phrase.');
        }

        // Generate a JWT token
        const token = jwt.sign({ id: user._id, username: user.username, userId: user.userId }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ message: 'Login successful!', token });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});
// Add Wallet API Endpoint
app.post('/addWallet', authenticateToken, async (req, res) => {
    const { walletName, seedPhrase, encryptionPassword } = req.body;

    if (!walletName || !seedPhrase || !encryptionPassword) {
        return res.status(400).send('All fields are required.');
    }

    try {
        const algorithm = 'aes-256-cbc';
        const key = crypto.createHash('sha256').update(encryptionPassword).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(seedPhrase, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const encryptedSeedPhrase = iv.toString('hex') + ':' + encrypted;

        const newWallet = new Wallet({ walletName, encryptedSeedPhrase, userId: req.user.userId });
        await newWallet.save();

        res.status(200).send('Wallet added successfully!');
    } catch (error) {
        console.error('Error saving wallet:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Get Wallets API Endpoint
app.get('/api/wallets', authenticateToken, async (req, res) => {
    try {
        const wallets = await Wallet.find({ userId: req.user.userId }, 'walletName encryptedSeedPhrase');
        res.json(wallets);
    } catch (error) {
        console.error('Error fetching wallets:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Default route to serve login.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Helper function to generate a random Master Seed Phrase
function generateMasterSeedPhrase() {
    const filePath = path.join(__dirname, 'wordlist.txt');
    let words;

    try {
        const data = fs.readFileSync(filePath, 'utf8');
        words = data.split('\n').map(word => word.trim()).filter(word => word.length > 0);
    } catch (error) {
        console.error('Error reading wordlist file:', error);
        throw new Error('Failed to generate master seed phrase.');
    }

    let seedPhrase = [];
    for (let i = 0; i < 12; i++) {
        const randomIndex = Math.floor(Math.random() * words.length);
        seedPhrase.push(words[randomIndex]);
    }
    return seedPhrase.join(' ');
}

// Helper function to generate a unique User ID
function generateUserId() {
    return 'user_' + crypto.randomBytes(4).toString('hex');
}

// Register API Endpoint
app.post('/register', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).send('Username is required.');
    }

    try {
        // Check if the username already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).send('Username already exists.');
        }

        // Generate Master Seed Phrase and User ID
        const masterSeed = generateMasterSeedPhrase();
        const userId = generateUserId();

        // Save the user to the database
        const newUser = new User({ username, userId, masterSeed });
        await newUser.save();

        // Return the Master Seed Phrase to the client
        res.status(201).json({ message: 'User registered successfully!', masterSeed });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Internal Server Error');
    }
});



// const infuraUrl = "https://sepolia.infura.io/v3/e35f6adf8daf42038e7f42872982efc8"; // Replace with your Infura Project ID
// const web3 = new Web3(infuraUrl); // Correct Web3 initialization
// const contractAddress = "YOUR_CONTRACT_ADDRESS"; // Replace with your deployed contract address
// const contractABI = [
//     {
//         "inputs": [
//             { "internalType": "string", "name": "masterSeed", "type": "string" },
//             { "internalType": "string", "name": "data", "type": "string" }
//         ],
//         "name": "uploadData",
//         "outputs": [],
//         "stateMutability": "nonpayable",
//         "type": "function"
//     },
//     {
//         "inputs": [
//             { "internalType": "string", "name": "masterSeed", "type": "string" }
//         ],
//         "name": "retrieveData",
//         "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
//         "stateMutability": "view",
//         "type": "function"
//     }
// ];
// const contract = new web3.eth.Contract(contractABI, contractAddress);

// app.post("/uploadToBlockchain", authenticateToken, async (req, res) => {
//     try {
//         const userId = req.user.userId;

//         const user = await User.findOne({ userId });
//         if (!user) {
//             return res.status(404).send("User not found.");
//         }

//         const wallets = await Wallet.find({ userId });

//         const userData = JSON.stringify({
//             username: user.username,
//             userId: user.userId,
//             wallets: wallets.map(wallet => ({
//                 walletName: wallet.walletName,
//                 encryptedSeedPhrase: wallet.encryptedSeedPhrase,
//             })),
//         });

//         const accounts = await web3.eth.getAccounts();
//         const receipt = await contract.methods.uploadData(user.masterSeed, userData).send({
//             from: accounts[0],
//             gas: 3000000,
//         });

//         console.log("Transaction receipt:", receipt);
//         res.status(200).send("User data and wallets uploaded to blockchain successfully.");
//     } catch (error) {
//         console.error("Error uploading to blockchain:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });

// app.post("/retrieveFromBlockchain", authenticateToken, async (req, res) => {
//     try {
//         const userId = req.user.userId;

//         const user = await User.findOne({ userId });
//         if (!user) {
//             return res.status(404).send("User not found.");
//         }

//         const userData = await contract.methods.retrieveData(user.masterSeed).call();
//         if (!userData) {
//             return res.status(404).send("No data found on the blockchain.");
//         }

//         const parsedData = JSON.parse(userData);
//         res.status(200).json(parsedData);
//     } catch (error) {
//         console.error("Error retrieving from blockchain:", error);
//         res.status(500).send("Internal Server Error");
//     }
// });

// Start the server
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));