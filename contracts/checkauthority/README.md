# Check Authority System Call

This system call improves the security of the default `check_authority` present in koinos. In particular, it rejects operations that have not been explicitly approved by the user in order to protect his assets.

#### What is the difference with respect to the default check authority?

This table summarizes the difference in the logic of both system calls:

| step | Default check authority                        | New check authority                            |
| ---- | ---------------------------------------------- | ---------------------------------------------- |
| 1    | ---                                            | Accept the user as caller                      |
| 2    | Call the authorize function if it is overriden | Call the authorize function if it is overriden |
| 3    | ---                                            | Do not accept contract calling a contract      |
| 4    | Check if the signature is present              | Check if the signature is present              |

The principal feature we want to introduce here is the step 3, which rejects a transaction when the operation is not approved by the user explicitly.

#### Why is it needed?

To understand the need of this system call let's see an example by using the default `check_authority`. In this example Alice uses a typical account (Alice doesn't have a smart contract wallet) and she interacts with a scam contract:

- Alice signs a transaction that calls the Token X to mint 1000 tokens.
- The Token X calls the Koin Contract to take the Koins from Alice.
- The Koin Contract calls the `check_authority` function to see if this transfer is approved by Alice.
- This function returns true because the Alice's signature is present in the transaction.

In conclusion, Alice called the Token X and this contract was able to take her Koins without an explicit consent.

With the new system call this example would fail because the new `check_authority` function do not accept a contract calling a contract (token X calling koin contract).

#### If the caller cannot be a contract, how could a DEX be implemented?

You maybe wondering that the previous example is very similar to the functionality implemented in a DEX. Alice calls the DEX and this contract calls the Koin contract to move the tokens from Alice. Then, how could a DEX be implemented?

The Koin contract needs to implement "allowances". In fact, this is the process used in the ERC-20 tokens of Ethereum. Allowances means that before calling the DEX, the user has to call the Koin Contract to allow the DEX to spend a specific amount of Koins. When the Koin contract calls the `check_authority` function it will return false because the caller is the DEX. However, after that, the Koin contract checks if there is an allowance. It will find the one set in the previous operation by the user and the transfer will be accepted.

#### Does this new system call disable the flexibility of the smart contract wallets?

No. The functionality of the smart contract wallets remains intact. Please check the table above where the differences between the old and new system call were described. As you can see the authorize function is verified before checking the step 3 (contract calling a contract), then this part will continue working as before.

#### Does this new system call replaces the old one?

No. Both system calls will co-exist and the developers will be free to select any of them for their contracts. However, it is recommended to use the new one for the reasons explained above.

The new system call will use the ID 607. See the different IDs in [system_call_ids.proto from koinos-proto](https://github.com/koinos/koinos-proto/blob/master/koinos/chain/system_call_ids.proto).

## Testing

Install the packages by running:

```sh
yarn install
```

Build the check authority contract and the test contracts:

```sh
yarn checkauthority:build-all
```

Run the unit tests:

```sh
yarn checkauthority:test
```

Run the integration tests:

```sh
yarn checkauthority:test:e2e
```

## Check deployment

To get the sha256 identifier of the compiled wasm run:

```sh
yarn checkauthority:info
```

Alternatively, you can do the same by running docker to intall, build, and get the info:

```sh
yarn checkauthority:docker
```

Then compare the sha256 identifier with the sha256 id of the deployed contract in the blockchain to verify the authenticity.
