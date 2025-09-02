#!/usr/bin/env bash
# check_benchmark.sh
set -euo pipefail

# Load params (CHANNEL, CHAINCODE, FAST_PEER_ADDRESS, etc.)
source "$(dirname "$0")/base_parameters.sh"

# Point the CLI at the fast peer (org1 peer0 by default)
FAST_PEER_ADDRESS=localhost
export CORE_PEER_ADDRESS="${FAST_PEER_ADDRESS}:7051"

export FABRIC_CFG_PATH=${PWD}/../../config

# Arg 1 = account id (e.g., account0)
peer chaincode query \
  -C "${CHANNEL}" -n "${CHAINCODE}" \
  -c "{\"Args\":[\"GetBalance\",\"${1}\"]}"