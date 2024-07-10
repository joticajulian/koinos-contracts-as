import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi } from "koilib/lib/interface";
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

  await new Promise((r) => {
    setTimeout(r, 2000);
  });
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

  const names = [
    "julian",
    "carlos1234",
    "review",
    "outside",
    "absorb",
    "pumpkin",
  ];

  for (let i = 0; i < names.length; i += 1) {
    await tx.pushOperation(nick["mint"], {
      to: account1.address,
      token_id: encodeHex(names[i]),
    });
  }

  const receipt = await tx.send();
  expect(receipt).toBeDefined();

  await tx.wait();

  // get owner of token
  const { result: resultOwnerOf } = await nick["owner_of"]({
    token_id: encodeHex("outside"),
  });
  expect(resultOwnerOf).toStrictEqual({
    value: account1.address,
  });

  // get list of tokens
  const { result: resultListTokens } = await nick["get_tokens"]({
    start: "",
    limit: 20,
    descending: false,
  });

  expect(resultListTokens).toStrictEqual({
    token_ids: [
      "absorb",
      "julian",
      "review",
      "outside",
      "pumpkin",
      "carlos1234",
    ].map(encodeHex),
  });

  // get tokens of account 1
  const { result: tokensA1 } = await nick["get_tokens_by_owner"]({
    owner: account1.address,
    start: "",
    limit: 20,
    descending: false,
  });
  expect(tokensA1).toStrictEqual({
    token_ids: [
      "absorb",
      "julian",
      "review",
      "outside",
      "pumpkin",
      "carlos1234",
    ].map(encodeHex),
  });
});

it.each([
  ["pumpkin", "@pumpkin already exists"],
  ["absorc", "@absorc is similar to the existing name @absorb"],
  ["pumpkim", "@pumpkim is similar to the existing name @pumpkin"],
  ["tpumpkin", "@tpumpkin is similar to the existing name @pumpkin"],
  ["absrb", "@absrb is similar to the existing name @absorb"],
  ["pumpkinn", "@pumpkinn is similar to the existing name @pumpkin"],
  ["umpkin", "@umpkin is similar to the existing name @pumpkin"],
  ["punpkin", "@punpkin is similar to the existing name @pumpkin"],
])("should fail for %s", async (name, error) => {
  await expect(
    nick["mint"]({
      to: account1.address,
      token_id: encodeHex(name),
    })
  ).rejects.toThrow(
    JSON.stringify({
      error,
      code: 1,
      logs: [`transaction reverted: ${error}`],
    })
  );
});

it("should work for large names", async () => {
  let result = await nick["mint"]({
    to: account1.address,
    token_id: encodeHex("a123456789012345678901234567890a"),
  });

  expect(result.receipt).toStrictEqual(
    expect.objectContaining({
      compute_bandwidth_used: expect.any(String),
      disk_storage_used: expect.any(String),
      network_bandwidth_used: expect.any(String),
    })
  );

  // mint a small name to check the difference
  // in the mana costs
  result = await nick["mint"]({
    to: account1.address,
    token_id: encodeHex("a12"),
  });

  expect(result.receipt).toStrictEqual(
    expect.objectContaining({
      compute_bandwidth_used: expect.any(String),
      disk_storage_used: expect.any(String),
      network_bandwidth_used: expect.any(String),
    })
  );

  // As reference, this is the cost associated in the first
  // version of nicknames (using Levenshtein distance)
  // using a name of 9 letters
  //
  // disk_storage_used: "342"
  // network_bandwidth_used: "346"
  // compute_bandwidth_used: "3157419"
});
