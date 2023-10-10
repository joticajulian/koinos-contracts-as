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

  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("absorb"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("pumpkin"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("carlos1234"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("review"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("outside"),
  });
  await tx.pushOperation(nick["mint"], {
    to: account1.address,
    token_id: encodeHex("julian"),
  });

  const receipt = await tx.send();
  expect(receipt).toBeDefined();

  await tx.wait();

  /*// get owner of token
  const { result: resultOwnerOf } = await nick["owner_of"]({
    token_id: encodeHex("absorb"),
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
    token_ids: ["absorb", "julian", "review", "outside", "pumpkin", "carlos1234"].map(
      encodeHex
    ),
  });

  // get tokens of account 1
  const { result: tokensA1 } = await nick["get_tokens_by_owner"]({
    owner: account1.address,
    start: "",
    limit: 20,
    direction: 0,
  });
  expect(tokensA1).toStrictEqual({
    token_ids: ["absorb", "julian", "review", "outside", "pumpkin", "carlos1234"].map(
      encodeHex
    ),
  });

  // reject similar names
  const tests = [
    // check by alphabetic order
    //
    // same name
    ["pumpkin", "@pumpkin already exist"],
    // similar to the previous
    ["absorc", "@absorc is similar to the existing name @absorb"],
    // similar to the next
    ["pumpkim", "@pumpkim is similar to the existing name @pumpkin"],

    // check by alphabetic order where the
    // first letter of the candidate is not taken
    // into account
    //
    // same from second letter
    ["tpumpkin", "@tpumpkin is similar to the existing name @pumpkin"],
    // second letter similar to the previous
    ["tabsorbb", "@tabsorbb is similar to the existing name @absorb"],
    // second letter similar to the next
    ["tpumpkim", "@tpumpkim is similar to the existing name @pumpkin"],

    // check by alphabetic order but this time the
    // first letter of the existing names are not taken
    // into account
    //
    // same from second letter
    ["umpkin", "@umpkin is similar to the existing name @?umpkin"],
    // similar to second letter of previous
    ["umpkio", "@umpkio is similar to the existing name @?umpkin"],
    // similar to second letter of next
    ["umpkim", "@umpkim is similar to the existing name @?umpkin"],

    // others
    ["fumpkim", "@fumpkim is similar to the existing name @?umpkin"],
  ];*/

  const tests = [
    ["tpumpkin", "@tpumpkin is similar to the existing name @pumpkin"],
  ];

  for (let i = 0; i < tests.length; i += 1) {
    await expect(
      nick["mint"]({
        to: account1.address,
        token_id: encodeHex(tests[i][0]),
      })
    ).rejects.toThrow(
      JSON.stringify({
        error: tests[i][1],
        code: 1,
        logs: [`transaction reverted: ${tests[i][1]}`],
      })
    );
  }
});
