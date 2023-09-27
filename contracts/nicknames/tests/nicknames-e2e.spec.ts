import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as abi from "../build/nicknames-abi.json";

jest.setTimeout(600000);

function encodeHex(value: string): string {
  return `0x${Buffer.from(new TextEncoder().encode(value)).toString("hex")}`;
}

function decodeHex(hex: string): string {
  return new TextDecoder().decode(Buffer.from(hex.replace("0x", ""), "hex"));
}

const localKoinos = new LocalKoinos();
const nicknamesAbi = abi as Abi;

const nicknamesAccount = new Signer({
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

const nick = new Contract({
  id: nicknamesAccount.getAddress(),
  abi: nicknamesAbi,
  signer: account1,
  provider: localKoinos.getProvider(),
}).functions;

beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  // deploy contracts
  await localKoinos.deployContract(
    nicknamesAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/nicknames.wasm"),
    nicknamesAbi
  );
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should work", async () => {
  // mint tokens
  let tx = new Transaction({
    signer: account1,
    provider: localKoinos.getProvider(),
  });

  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("alice"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("alice1234"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("bobby"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("baloons"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("bobby1234"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("burnburn1234"),
  });

  const receipt = await tx.send();
  expect(receipt).toBeDefined();

  await tx.wait();

  // get owner of token
  const { result: resultOwnerOf } = await nick["owner_of"]({
    token_id: encodeHex("bobby"),
  });
  expect(resultOwnerOf).toStrictEqual({
    account: account1.address,
  });

  // get list of tokens
  const { result: resultListTokens } = await nick["get_tokens"]({
    start: "",
    limit: 20,
    direction: 0,
  });

  expect(resultListTokens).toStrictEqual({
    token_ids: [
      "alice",
      "bobby",
      "baloons",
      "alice1234",
      "bobby1234",
      "burnburn1234",
    ].map(encodeHex),
  });

  // get tokens of account 1
  const { result: tokensA1 } = await nick["get_tokens_by_owner"]({
    owner: account1.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(tokensA1).toStrictEqual({
    token_ids: [
      "alice",
      "bobby",
      "baloons",
      "alice1234",
      "bobby1234",
      "burnburn1234",
    ].map(encodeHex),
  });

  // reject similar names
  await expect(
    nick["mint"]({
      to: account1.address,
      token_id: encodeHex("bobby12"),
    })
  ).rejects.toThrow(
    JSON.stringify({
      error: "'bobby12' is similar to the existing name 'bobby'",
      code: 1,
      logs: [
        "transaction reverted: 'bobby12' is similar to the existing name 'bobby'",
      ],
    })
  );

  await expect(
    nick["mint"]({
      to: account1.address,
      token_id: encodeHex("obby12"),
    })
  ).rejects.toThrow(
    JSON.stringify({
      error: "'obby12' is similar to the existing name 'bobby'",
      code: 1,
      logs: [
        "transaction reverted: 'obby12' is similar to the existing name 'bobby'",
      ],
    })
  );
});
