'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fabric_network_1 = require("fabric-network");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const exec = __importStar(require("child_process"));
async function main() {
    const conflictPercentage = parseInt(process.argv[6]);
    const endorserIdx = parseInt(process.argv[5]);
    const repetitions = parseInt(process.argv[4]);
    const transferCount = parseInt(process.argv[3]);
    const iteration = parseInt(process.argv[2]);
    const bcResps = [];
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
    const wallet = await fabric_network_1.Wallets.newFileSystemWallet(path.join(__dirname, 'wallet'));
    const id = await wallet.get(user);
    if (!id) {
        console.error(`No wallet identity for ${user}`);
        process.exit(1);
    }
    const gateway = new fabric_network_1.Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: user,
        discovery: { enabled: true, asLocalhost: true },
        eventHandlerOptions: { strategy: null } // don't wait for commit events
    });
    const channelName = String(process.env.CHANNEL || 'mychannel');
    const ccName = String(process.env.CHAINCODE || 'basic');
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(ccName);
    // quick read to confirm wiring (adjust to existing key)
    try {
        const bal = await contract.evaluateTransaction('GetBalance', 'account0');
        console.log('probe GetBalance(account0)=', bal.toString());
    }
    catch (e) {
        console.error('probe evaluate failed:', (e === null || e === void 0 ? void 0 : e.message) || e);
        process.exit(1);
    }
    for (let r = 0; r < repetitions; r++) {
        for (let i = iteration * transferCount; i < iteration * transferCount + transferCount - 1; i += 2) {
            if (Math.random() <= conflictPercentage / 100) {
                bcResps.push(contract.submitTransaction('Transfer', 'account0', 'account1', '1'));
            }
            else {
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
