import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as abi from "../build/nft-abi.json";

jest.setTimeout(600000);

function fromBase64urlToBase64(data: string): string {
  return data.replace(/\_/g, "/").replace(/\-/g, "+");
}

const localKoinos = new LocalKoinos();
const nftAbi = abi as Abi;

const nftAccount = new Signer({
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

const nft = new Contract({
  id: nftAccount.getAddress(),
  abi: nftAbi,
  provider: localKoinos.getProvider(),
}).functions;

beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  // deploy contracts
  await localKoinos.deployContract(
    nftAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/nft.wasm"),
    nftAbi
  );
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should work", async () => {
  // mint tokens
  let tx = new Transaction({
    signer: nftAccount,
    provider: localKoinos.getProvider(),
  });

  await tx.pushOperation(nft["mint"], {
    to: account1.address,
    token_id: "0x0103",
  });
  await tx.pushOperation(nft["mint"], {
    to: account1.address,
    token_id: "0x0102",
  });
  await tx.pushOperation(nft["mint"], {
    to: account1.address,
    token_id: "0x0101",
  });
  await tx.pushOperation(nft["mint"], {
    to: account2.address,
    token_id: "0x02fa",
  });
  await tx.pushOperation(nft["mint"], {
    to: account3.address,
    token_id: "0x0301",
  });
  await tx.pushOperation(nft["mint"], {
    to: account3.address,
    token_id: "0x0302",
  });

  const receipt = await tx.send();
  expect(receipt).toBeDefined();

  await tx.wait();

  // get owner of token
  const { result: resultOwnerOf } = await nft["owner_of"]({
    token_id: "0x02fa",
  });
  expect(resultOwnerOf).toStrictEqual({
    account: account2.address,
  });

  // get list of tokens
  const { result: resultListTokens } = await nft["get_tokens"]({
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(resultListTokens).toStrictEqual({
    token_ids: ["0x0101", "0x0102", "0x0103", "0x02fa", "0x0301", "0x0302"],
  });

  // get tokens of account 1
  const { result: tokensA1 } = await nft["get_tokens_by_owner"]({
    owner: account1.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(tokensA1).toStrictEqual({
    token_ids: ["0x0101", "0x0102", "0x0103"],
  });

  // get some tokens of account 1
  const { result: someTokensA1 } = await nft["get_tokens_by_owner"]({
    owner: account1.address,
    start: "0x0101",
    limit: 20,
    direction: 0,
  });
  expect(someTokensA1).toStrictEqual({
    token_ids: ["0x0102", "0x0103"],
  });

  // get tokens of account 2
  const { result: tokensA2 } = await nft["get_tokens_by_owner"]({
    owner: account2.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(tokensA2).toStrictEqual({
    token_ids: ["0x02fa"],
  });

  // get tokens of account 3
  const { result: tokensA3 } = await nft["get_tokens_by_owner"]({
    owner: account3.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(tokensA3).toStrictEqual({
    token_ids: ["0x0301", "0x0302"],
  });

  // account 1 transfers a token to account 2
  const txTransfer = new Transaction({
    signer: account1,
    provider: localKoinos.getProvider(),
  });

  await txTransfer.pushOperation(nft["transfer"], {
    from: account1.address,
    to: account2.address,
    token_id: "0x0102",
  });

  await txTransfer.send();
  await txTransfer.wait();

  // get new owner of token
  const { result: resultNewOwnerOf } = await nft["owner_of"]({
    token_id: "0x0102",
  });
  expect(resultNewOwnerOf).toStrictEqual({
    account: account2.address,
  });

  // get new tokens of account 1
  const { result: newTokensA1 } = await nft["get_tokens_by_owner"]({
    owner: account1.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(newTokensA1).toStrictEqual({
    token_ids: ["0x0101", "0x0103"],
  });

  // get new tokens of account 2
  const { result: newTokensA2 } = await nft["get_tokens_by_owner"]({
    owner: account2.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(newTokensA2).toStrictEqual({
    token_ids: ["0x0102", "0x02fa"],
  });
});
