import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as abi from "../build/token-abi.json";

jest.setTimeout(600000);

const localKoinos = new LocalKoinos();
const tokenAbi = abi as Abi;

const tokenAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const account1 = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const account2 = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const account3 = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const token = new Contract({
  id: tokenAccount.getAddress(),
  abi: tokenAbi,
  provider: localKoinos.getProvider(),
}).functions;

beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  // deploy get contract metadata
  const getContractMetadataAccount = new Signer({
    privateKey: randomBytes(32).toString("hex"),
    provider: localKoinos.getProvider(),
  });
  await localKoinos.deployContract(
    getContractMetadataAccount.getPrivateKey("wif"),
    path.join(
      __dirname,
      "../../testgetcontractmetadata/getcontractmetadata.wasm"
    ),
    {} as Abi
  );
  // set get_contract_metadata as system contract and system call
  await localKoinos.setSystemContract(getContractMetadataAccount.address, true);
  await localKoinos.setSystemCall(
    112,
    getContractMetadataAccount.address,
    0x784faa08
  );

  // deploy contracts
  await localKoinos.deployContract(
    tokenAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/token.wasm"),
    tokenAbi
  );
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should work", async () => {
  // mint tokens
  let tx = new Transaction({
    signer: tokenAccount,
    provider: localKoinos.getProvider(),
  });

  await tx.pushOperation(token["mint"], {
    to: account1.address,
    value: "123",
  });

  const receipt = await tx.send();
  expect(receipt).toBeDefined();

  await tx.wait();

  // get balance
  const { result: balance1 } = await token["balance_of"]({
    owner: account1.address,
  });
  expect(balance1).toStrictEqual({
    value: "123",
  });

  // account 1 transfers a token to account 2
  const txTransfer = new Transaction({
    signer: account1,
    provider: localKoinos.getProvider(),
  });

  await txTransfer.pushOperation(token["transfer"], {
    from: account1.address,
    to: account2.address,
    value: "100",
  });

  await txTransfer.send();
  await txTransfer.wait();

  // get balance
  const { result: balance2 } = await token["balance_of"]({
    owner: account2.address,
  });
  expect(balance2).toStrictEqual({
    value: "100",
  });
});
