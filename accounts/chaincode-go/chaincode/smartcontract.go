// fabric-samples/accounts/chaincode-go/chaincode/smartcontract.go
package chaincode

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/v2/contractapi"
)

// SmartContract mirrors Amelia's benchmark but follows Fabric samples' Contract API style.
type SmartContract struct{ contractapi.Contract }

type Account struct {
	Balance int64  `json:"Balance"` // alphabetical field names (deterministic JSON)
	ID      string `json:"ID"`
}

// -------- internal helpers --------

func accountKey(i int) string { return "account" + strconv.Itoa(i) }

func readAccount(ctx contractapi.TransactionContextInterface, id string) (*Account, error) {
	b, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("read %s: %w", id, err)
	}
	if b == nil {
		return nil, fmt.Errorf("account %s not found", id)
	}
	var a Account
	if err := json.Unmarshal(b, &a); err != nil {
		return nil, fmt.Errorf("unmarshal %s: %w", id, err)
	}
	return &a, nil
}

func writeAccount(ctx contractapi.TransactionContextInterface, a *Account) error {
	j, err := json.Marshal(a)
	if err != nil {
		return fmt.Errorf("marshal %s: %w", a.ID, err)
	}
	return ctx.GetStub().PutState(a.ID, j)
}

func accountExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	b, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, err
	}
	return b != nil, nil
}

// -------- Amelia-style API --------

// Init(firstAccount, accountCount, initValue)
func (c *SmartContract) Init(ctx contractapi.TransactionContextInterface, firstAccount int, accountCount int, initValue int64) error {
	for i := firstAccount; i < firstAccount+accountCount; i++ {
		id := accountKey(i)
		a := &Account{ID: id, Balance: initValue}
		if err := writeAccount(ctx, a); err != nil {
			return err
		}
	}
	return nil
}

// Transfer(A,B,X)
func (c *SmartContract) Transfer(ctx contractapi.TransactionContextInterface, A, B string, X int64) error {
	from, err := readAccount(ctx, A)
	if err != nil {
		return err
	}
	to, err := readAccount(ctx, B)
	if err != nil {
		return err
	}
	if from.Balance < X {
		return fmt.Errorf("insufficient funds")
	}
	from.Balance -= X
	to.Balance += X
	if err := writeAccount(ctx, from); err != nil {
		return err
	}
	if err := writeAccount(ctx, to); err != nil {
		return err
	}
	return nil
}

// Query(A)
func (c *SmartContract) Query(ctx contractapi.TransactionContextInterface, A string) (string, error) {
	a, err := readAccount(ctx, A)
	if err != nil {
		return "", err
	}
	return strconv.FormatInt(a.Balance, 10), nil
}

// -------- conveniences (sample-style) --------

func (c *SmartContract) InitAccounts(ctx contractapi.TransactionContextInterface, startIdx int, endIdx int, initial int64) error {
	for i := startIdx; i < endIdx; i++ {
		id := accountKey(i)
		a := &Account{ID: id, Balance: initial}
		if err := writeAccount(ctx, a); err != nil {
			return err
		}
	}
	return nil
}

func (c *SmartContract) GetBalance(ctx contractapi.TransactionContextInterface, id string) (int64, error) {
	a, err := readAccount(ctx, id)
	if err != nil {
		return 0, err
	}
	return a.Balance, nil
}

func (c *SmartContract) AccountExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	return accountExists(ctx, id)
}

func (c *SmartContract) GetAllAccounts(ctx contractapi.TransactionContextInterface) ([]*Account, error) {
	it, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer it.Close()

	var out []*Account
	for it.HasNext() {
		kv, err := it.Next()
		if err != nil {
			return nil, err
		}
		var a Account
		if err := json.Unmarshal(kv.Value, &a); err != nil {
			return nil, err
		}
		out = append(out, &a)
	}
	return out, nil
}
