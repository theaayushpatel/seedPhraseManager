# Seed Phrase Manager

A seed phrase manager application built using the MEARN stack (MongoDB, Express.js, React, Node.js) that stores crypto wallet seed phrases locally on MongoDB in an encrypted format using the AES-256 algorithm. The application also allows users to upload the database to the Ethereum blockchain using Infura for long-term storage.

## Features

- User authentication using a Master Seed Phrase
- Display a list of user's crypto wallets
- Add new wallets with encrypted seed phrases
- View wallet seed phrases by providing a decryption password
- Upload the MongoDB database to the Ethereum blockchain
- Retrieve the database from the blockchain using the Master Seed Phrase

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in the `.env` file
4. Start the server: `node app.js`

## Usage

1. Register a new user with a Master Seed Phrase
2. Log in with the Master Seed Phrase
3. Add new wallets and manage seed phrases
4. Upload the database to the blockchain for long-term storage
5. Retrieve the database from the blockchain using the Master Seed Phrase