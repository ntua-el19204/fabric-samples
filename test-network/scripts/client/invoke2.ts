'use strict';
import { Gateway, Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';
import * as exec from 'child_process';

async function main() {
  const conflictPercentage = parseInt(process.argv[6]);
  const endorserIdx = parseInt(process.argv[5]);
  const repetitions = parseInt(process.argv[4]);
  const transferCount = parseInt(process.argv[3]);
  const iteration = parseInt(process.argv[2]);
  const bcResps: Array<Promise<Buffer>> = [];

  const ccpPath = path.resolve('..', '..', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');

  let ccpStr = fs.readFileSync(ccpPath, 'utf8');
  const endorserAddresses = exec.execSync('bash printEndorsers.sh').toString().trim().split(/\s+/);
  ccpStr = ccpStr
    .replace(/CHANNEL/g, String(process.env.CHANNEL || 'mychannel'))
    .replace(/DOMAIN/g, String(process.env.PEER_DOMAIN || 'org1.example.com'))
    .replace(/ORDERER_ADDRESS/g, String(process.env.ORDERER_ADDRESS || 'localhost:7050'))
    .replace(/PEER_ADDRESS/g, endorserAddresses[endorserIdx] || 'localhost:7051');
  const ccp = JSON.parse(ccpStr);

  const user = `Admin@${process.env.PEER_DOMAIN || 'org1.example.com'}`;
  const wallet = await Wallets.newFileSystemWallet(path.join(__dirname, 'wallet'));
  const id = await wallet.get(user);
  if (!id) { console.error(`No wallet identity for ${user}`); process.exit(1); }


  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: user,
    discovery: { enabled: true, asLocalhost: true },
    eventHandlerOptions: { strategy: null }   // don't wait for commit events
  });

  const channelName = String(process.env.CHANNEL || 'mychannel');
  const ccName = String(process.env.CHAINCODE || 'basic');
  const network = await gateway.getNetwork(channelName);
  const contract = network.getContract(ccName);

  // quick read to confirm wiring (adjust to existing key)
  try {
    const bal = await contract.evaluateTransaction('GetBalance', 'account0');
    console.log('probe GetBalance(account0)=', bal.toString());
  } catch (e:any) {
    console.error('probe evaluate failed:', e?.message || e);
    process.exit(1);
  }

  for (let r = 0; r < repetitions; r++) {
    for (let i = iteration * transferCount; i < iteration * transferCount + transferCount - 1; i += 2) {
      if (Math.random() <= conflictPercentage / 100) {
        bcResps.push(contract.submitTransaction('Transfer', 'account0', 'account1', '1'));
      } else {
        bcResps.push(contract.submitTransaction('Transfer', `account${i}`, `account${i + 1}`, '1'));
      }
    }
  }
  for (let i = 0; i < bcResps.length; i++) {
    await bcResps[i];
  }

  await gateway.disconnect();
  console.log(`Thread ${iteration} is done!`);
}
main().catch(() => process.exit(1));
