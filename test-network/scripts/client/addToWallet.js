'use strict';
const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

(async () => {
  try {
    const peerDomain = process.env.PEER_DOMAIN || 'org1.example.com';
    const mspId = 'Org1MSP'; // matches test-network Org1

    // Use the test-network crypto material (NOT config/crypto-config)
    const credPath = path.resolve('..','..','organizations','peerOrganizations',peerDomain,'users',`Admin@${peerDomain}`,'msp');

    const certPath = path.join(credPath,'signcerts','Admin@org1.example.com-cert.pem');
    const keyDir  = path.join(credPath,'keystore');
    const keyFile = fs.readdirSync(keyDir).find(f => f.endsWith('.pem') || f.endsWith('_sk'));
    if (!keyFile) throw new Error(`No private key found in ${keyDir}`);

    const cert = fs.readFileSync(certPath,'utf8');
    const key  = fs.readFileSync(path.join(keyDir,keyFile),'utf8');

    const wallet = await Wallets.newFileSystemWallet(path.resolve('wallet'));
    await wallet.put(`Admin@${peerDomain}`, {
      type: 'X.509',
      mspId,
      credentials: { certificate: cert, privateKey: key }
    });

    console.log('Wallet populated with Admin identity:', `Admin@${peerDomain}`);
  } catch (e) {
    console.error('Error adding to wallet:', e.message);
    process.exit(1);
  }
})();
