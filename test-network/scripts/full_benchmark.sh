#!/usr/bin/env bash
# full_benchmark.sh
# Usage:
#   ./full_benchmark.sh <init_start> <init_count> <init_value> \
#       <offset> <threadCount> <totalThreads> <targetEndorserIdx> <conflictPct> <accountCount>

set -euo pipefail

INIT_START="${1:-0}"
INIT_COUNT="${2:-1000}"
INIT_VALUE="${3:-100}"

OFFSET="${4:-0}"
THREAD_COUNT="${5:-2}"
TOTAL_THREADS="${6:-2}"
TARGET_ENDORSER_IDX="${7:-0}"
CONFLICT_PCT="${8:-0}"
ACCOUNT_COUNT="${9:-100}"

CHANNEL="mychannel"
CC_NAME="basic"
CC_LANG="go"
CC_SRC_PATH="../accounts/chaincode-go"
ORDERER_ADDR="localhost:7050"
ORG1_PEER="localhost:7051"
ORG2_PEER="localhost:9051"
PEER_DOMAIN="org1.example.com"

# --- move to test-network root ---
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${TN_ROOT}"

# --- env for CLIs ---
export PATH="${TN_ROOT}/../bin:${PATH}"
export FABRIC_CFG_PATH="${TN_ROOT}/../config"
export CORE_PEER_TLS_ENABLED=true

ORDERER_TLS_CA="${TN_ROOT}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
ORG1_TLS_CA="${TN_ROOT}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
ORG2_TLS_CA="${TN_ROOT}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"

export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_MSPCONFIGPATH="${TN_ROOT}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="${ORG1_PEER}"
export CORE_PEER_TLS_ROOTCERT_FILE="${ORG1_TLS_CA}"

# 1) down + up + channel
./network.sh down
./network.sh up createChannel -c "${CHANNEL}"

# 2) deploy CC
./network.sh deployCC -ccn "${CC_NAME}" -ccp "${CC_SRC_PATH}" -ccl "${CC_LANG}" -c "${CHANNEL}"

# 3) initialize accounts
peer chaincode invoke \
  -o "${ORDERER_ADDR}" --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile "${ORDERER_TLS_CA}" \
  -C "${CHANNEL}" -n "${CC_NAME}" \
  --peerAddresses "${ORG1_PEER}" --tlsRootCertFiles "${ORG1_TLS_CA}" \
  --peerAddresses "${ORG2_PEER}" --tlsRootCertFiles "${ORG2_TLS_CA}" \
  -c "{\"Args\":[\"Init\",\"${INIT_START}\",\"${INIT_COUNT}\",\"${INIT_VALUE}\"]}" \
  --waitForEvent

peer chaincode query -C "${CHANNEL}" -n "${CC_NAME}" -c '{"Args":["GetBalance","account0"]}' || true

# 4) compile client + add wallet id + run bench
pushd "${TN_ROOT}/scripts/client" >/dev/null
npx tsc

export FABRIC_CFG_PATH="${TN_ROOT}"   # for addToWallet.js to find ./organizations/...
export PEER_DOMAIN="${PEER_DOMAIN}"
node addToWallet.js

export CHANNEL="${CHANNEL}"
export CHAINCODE="${CC_NAME}"
export ORDERER_ADDRESS="${ORDERER_ADDR}"
export PEER_DOMAIN="${PEER_DOMAIN}"

chmod +x ./run_benchmark.sh
./run_benchmark.sh "${OFFSET}" "${THREAD_COUNT}" "${TOTAL_THREADS}" "${TARGET_ENDORSER_IDX}" "${CONFLICT_PCT}" "${ACCOUNT_COUNT}"
popd >/dev/null

echo "All done ✅"
