#!/usr/bin/env bash

# For test-network, everything runs on localhost
export PEER_DOMAIN="org1.example.com"
export ORDERER_DOMAIN="example.com"

# Peer and orderer addresses (without domain suffix in Amelia’s style, but we’ll keep localhost)
export FAST_PEER_ADDRESS="localhost:7051"
export ORDERER_ADDRESS="localhost:7050"

# Endorsers: Org1 peer and Org2 peer
export ENDORSER_ADDRESS=( "localhost:7051" "localhost:9051" )

# Storage not used in your setup
export STORAGE_ADDRESS=""

# Channel + chaincode name
export CHANNEL="mychannel"
export CHAINCODE="basic"
