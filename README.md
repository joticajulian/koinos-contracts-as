# Koinos Token Builder (Assembly Script)

This repo contains a set of contracts that may be used to launch your own token.The basic usage of this contract builder is as follows:

1. Clone and install this repo.
2. Adjust the `.env` file used by the deployer.
3. Adjust the `\token\assembly\Token.ts` file.
4. Compile the smart contrac using the builder.
5. Upload the smart contract using the built in deployer.

## Dependencies

1. NodeJS (see below for additional information)

2. Yarn Package Manager

NodeJS is necessary to develop and build the smart contract. Follow the instructions at [the NodeJS website](https://nodejs.org/) for installation guide specific to your machine.

#### Notes for Installation on Mac M1s:

Newer version of NodeJs may not work properly with this repo. We have tested to ensure that version 16.13.1 works however if you find an error while compiling that appears similar to this output:

```

npm ERR! command /usr/local/bin/node /usr/local/lib/node_modules/npm/bin/npm-cli.js install --force

--cache=/Users/motoengineer/.npm --prefer-offline=false --prefer-online=false --offline=false --no-progress --no-save

--no-audit --include=dev --include=peer --include=optional --no-package-lock-only --no-dry-run

```

Then try running this command:

```

sudo chown -R 501:20 "/Users/{username}/.npm"

```

## Tested Operating Systems

This tutorial has been tested for:

1. Mac M1 Silicone
2. Mac Intel
3. Linux (Ubuntu)

Once your development environment is setup, lets begin:

## Step 1: Installing the SDK

Clone the repo by using the following command:

```

git clone https://github.com/joticajulian/koinos-contracts-as

```

Change into the directory of the SDK by using the following command:

```

cd koinos-contract-as

```

Install the dependencies within the folder with yarn by using the following command:

```

yarn install

```

## Step 2: Modify your .env for the deployer

The `koinos-contract-as` repo contains a deployment script so you do not need manually deploy via the `koinos-cli` wallet. To use the automatic deployer, you must set it up first. To do this clone the `env.example` file and modify it. To begin, clone and rename the file as `.env` using the following command:

```

cp env.example .env

```

Open `.env` with the editor of your choice. Once open, it should appear something like this:

```

HARBINGER_MANA_SHARER_PRIVATE_KEY=
HARBINGER_TOKEN_CONTRACT_PRIVATE_KEY=
HARBINGER_TOKEN_CONTRACT_ID=

MAINNET_MANA_SHARER_PRIVATE_KEY=
MAINNET_TOKEN_CONTRACT_PRIVATE_KEY=
MAINNET_TOKEN_CONTRACT_ID=

```

If you are developing on test net, fill in the information for `HARBINGER`, if you are developing on main net, fill in the information for `MAINNET`.

- The `_MANA_SHARER_PRIVATE_KEY` is the private key to a Koinos wallet that containts liquid $KOIN. This wallet is used to cover the Mana cost of uploading the `.wasm` and `.abi` file to the Koinos Blockchain. If you are working on testnet and need testnet $KOIN ($tKOIN) then head over the discord faucet to get some for free. For main net, you will need to buy $KOIN from a CEX or DEX.

- The `_TOKEN_CONTRACT_PRIVATE_KEY` is the private key to the wallet address that will hold your smart contract. You may create a wallet using `koinos-cli` or any of the 3rd party wallets.

- The `_TOKEN_CONTRACT_ID` is the wallet address associated with the `_TOKEN_CONTRACT_PRIVATE_KEY`.

In total, you will need two wallets and their private keys. One wallet contains liquid $KOIN (or $tKOIN), while the other can have no $KOIN. The purpose of this is so you can deploy a smart contract into an empty wallet and not end up with any dust in it.

## Step 3: Modify Token.ts

Enter the `contracts` folder and you will find three folders.

- `hello` is a basic hello world contract. It is not used in this tutorial, but you can use it as a reference. Open package.json for scripts on its compilation and deployment.

- `manasharer` is a script that allows the mana cost to deploy the contract to be covered by the wallet address of the`_MANA_SHARER_PRIVATE_KEY`.

- `token` is a typical token contract that can create new tokens.

Open the file located at `/token/assembly/proto/token.ts` and scroll to line 24-27. Adjust the variables to suite your project. It should appear something similar to this:

```
 _name: string = "My Token";
  _symbol: string = "TKN";
  _decimals: u32 = 8;
```

If you want to make any more adjustments, feel free to make them now.

Once you are done, save the file.

## Step 3: Compile the Token Project

From the `/contracts` folder, run the following command to build your contract.

```

yarn token:build

```

You should get a response that looks similar to this:

```

yarn run v1.22.15

$ yarn token:precompile && yarn token:asbuild:release

$ koinos-precompiler-as contracts/token

source file copied to /Users/learnkoinos/koinos-contracts-as/contracts/token/build

/Users/learnkoinos/koinos-contracts-as/contracts/token/build/proto/token.proto

proto files generated at /Users/learnkoinos/koinos-contracts-as/contracts/token/build/proto

interfaces generated at /Users/learnkoinos/koinos-contracts-as/contracts/token/build/interfaces

abi file generated at /Users/learnkoinos/koinos-contracts-as/contracts/token/build/token-abi.json

precompilation generated at /Users/learnkoinos/koinos-contracts-as/contracts/token/build/index.ts

$ asc contracts/token/build/index.ts --config contracts/token/asconfig.json --use abort= --target release

✨ Done in 5.89s.

```

If all is well, then you've just compiled your token contract.

### Step 4: Deploy your Token Project

Since we already setup our `.env` file earlier, we simply need to execute the following command:

```

yarn token:deploy

```

You should get a response that looks similar to this:

```

yarn run v1.22.15

$ ts-node contracts/token/scripts/deployment.ts

TypeError: Cannot read properties of undefined (reading '0')

at bitcoinDecode (/Users/learnkoinos/koinos-contracts-as/node_modules/koilib/src/utils.ts:166:12)

at Function.fromWif (/Users/learnkoinos/koinos-contracts-as/node_modules/koilib/src/Signer.ts:262:37)

at /Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:15:35

at step (/Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:33:23)

at Object.next (/Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:14:53)

at /Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:8:71

at new Promise (<anonymous>)

at __awaiter (/Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:4:12)

at main (/Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:49:12)

at Object.<anonymous> (/Users/learnkoinos/koinos-contracts-as/contracts/token/scripts/deployment.ts:49:1)

✨ Done in 0.79s.

```

If all is well, then you've just deployed your token contract to the address you've entered previously in the `_TOKEN_CONTRACT_ID` field. You can register the token with `koinos-cli` and begin to interact with it. You may also use [Koinos Blocks](http://koinosblocks.com) to interact with your token. Just search by entering the `_TOKEN_CONTRACT_ID` in the search field of Koinos Blocks.

### Step 5: Minting new Tokens

Since the token is now initialized, you can generate new tokens. This repo includes a token generator script located at `koinos-contracts-as/contracts/token/scripts/mint.ts`. Open this file with your preferred editor and go to line 35. You may adjust the value to mint as many tokens as you wish for whatever purpose you are intending to use it for.

Note: If you are getting `rclimit` errors. Reduce the `rclimit` shown on line 26 or get more `$tKOIN/$KOIN`.
