package main

import (
	"log"

	"github.com/ntua-el19204/fabric-samples/accounts/chaincode-go/chaincode"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

func main() {
	cc, err := contractapi.NewChaincode(&chaincode.SmartContract{})
	if err != nil {
		log.Panicf("Error creating accounts chaincode: %v", err)
	}
	if err := cc.Start(); err != nil {
		log.Panicf("Error starting accounts chaincode: %v", err)
	}
}
