import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as _checkauthorityAbi from "../../checkauthority/build/checkauthority-abi.json";
import * as _tokenAbi from "../build/token-abi.json";
import * as _testWalletAbi from "../build/testwallet-abi.json";
import * as _testThirdPartyAbi from "../build/testthirdparty-abi.json";
const network = require("../../../scripts/networks.js").harbinger;

jest.setTimeout(600000);

function fromBase64urlToBase64(data: string): string {
  return data.replace(/\_/g, "/").replace(/\-/g, "+");
}

const localKoinos = new LocalKoinos();

const checkauthorityAbi = _checkauthorityAbi as Abi;
const tokenAbi = _tokenAbi as Abi;
const testWalletAbi = _testWalletAbi as Abi;
const testThirdPartyAbi = _testThirdPartyAbi as Abi;

const checkauthorityAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const tokenAccount = Signer.fromWif(network.accounts.token.privateKey);
tokenAccount.provider = localKoinos.getProvider();

const testWalletAccount = Signer.fromWif(
  network.accounts["token/testwallet"].privateKey
);
testWalletAccount.provider = localKoinos.getProvider();

const testUserAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testThirdPartyAccount = Signer.fromWif(
  network.accounts["token/testthirdparty"].privateKey
);
testWalletAccount.provider = localKoinos.getProvider();

const token = new Contract({
  // id: tokenAccount.getAddress(),
  signer: tokenAccount,
  abi: tokenAbi,
  provider: localKoinos.getProvider(),
});

const testWallet = new Contract({
  id: testWalletAccount.getAddress(),
  abi: testWalletAbi,
  provider: localKoinos.getProvider(),
});

const testThirdParty = new Contract({
  id: testThirdPartyAccount.getAddress(),
  abi: testThirdPartyAbi,
  provider: localKoinos.getProvider(),
});

beforeAll(async () => {
  // start local-koinos node
  await localKoinos.startNode();
  await localKoinos.startBlockProduction();

  // deploy contracts
  await localKoinos.deployContract(
    checkauthorityAccount.getPrivateKey("wif"),
    path.join(
      __dirname,
      "../../checkauthority/build/release/checkauthority.wasm"
    ),
    checkauthorityAbi
  );
  await localKoinos.deployContract(
    tokenAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/token.wasm"),
    tokenAbi
  );
  await localKoinos.deployContract(
    testWalletAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/testwallet.wasm"),
    testWalletAbi,
    {},
    // Alice override the authorize function
    { authorizesCallContract: true }
  );
  await localKoinos.deployContract(
    testThirdPartyAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/testthirdparty.wasm"),
    testThirdPartyAbi
  );

  // set check_authority contract as system contract and system call
  await localKoinos.setSystemContract(checkauthorityAccount.address, true);
  await localKoinos.setSystemCall(
    607,
    checkauthorityAccount.address,
    checkauthorityAbi.methods["check_authority"].entry_point
  );

  // mint some tokens for the wallet and the user
  const { transaction: t1 } = await token.functions["mint"]({
    to: testWalletAccount.address,
    value: "1000",
  });
  await t1.wait();

  const { transaction: t2 } = await token.functions["mint"]({
    to: testUserAccount.address,
    value: "1000",
  });
  await t2.wait();
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should fail when the signature is valid but it was called by a third party", async () => {
  expect.assertions(1);

  // This is the principal improvement we want to
  // add with this new system call. The third party should
  // not be able to access the Bob's assets even if he
  // signed the transaction.

  // If the use case requires this type of third party
  // access the contract should implement allowances.

  const tx = new Transaction({
    signer: testUserAccount,
    provider: localKoinos.getProvider(),
  });

  // call third party contract
  await tx.pushOperation(testThirdParty.functions["operate_external_assets"], {
    // try to access Bob's assets
    account: testUserAccount.getAddress(),
  });

  await expect(tx.send()).rejects.toThrow(
    JSON.stringify({
      error: "from has not authorized transfer",
      code: 1,
      logs: ["transaction reverted: from has not authorized transfer"],
    })
  );
});

it("should work when the user set an allowance to a third party to spend tokens", async () => {
  expect.assertions(1);

  // Now let's repeat the previous test but this time
  // the user set an allowance in the token contract

  const tx = new Transaction({
    signer: testUserAccount,
    provider: localKoinos.getProvider(),
  });

  // call token contract to set an allowance
  await tx.pushOperation(token.functions["approve"], {
    owner: testUserAccount.getAddress(),
    spender: testThirdPartyAccount.getAddress(),
    value: "10",
  });

  // call third party contract
  await tx.pushOperation(testThirdParty.functions["operate_external_assets"], {
    // try to access user assets
    account: testUserAccount.getAddress(),
  });

  const receipt = await tx.send();
  expect(receipt).toStrictEqual(
    expect.objectContaining({
      events: expect.arrayContaining([]),
    }) as unknown as TransactionReceipt
  );

  // note that this time it works because the user set an allowance
});

it("should fail when the smart wallet rejects the operation", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletAccount,
    provider: localKoinos.getProvider(),
  });

  // remove allowance in the smart wallet
  await tx.pushOperation(testWallet.functions["set_allowance"], {
    value: false,
  });

  // call test contract
  await tx.pushOperation(token.functions["transfer"], {
    from: testWalletAccount.getAddress(),
    to: testWalletAccount.getAddress(),
    value: "10",
  });
  const opEncoded = tx.transaction.operations[1].call_contract;

  await expect(tx.send()).rejects.toThrow(
    JSON.stringify({
      error: "from has not authorized transfer",
      code: 1,
      logs: [
        "authorize called",
        "type: 0",
        "no caller",
        `contract id: ${opEncoded.contract_id}`,
        `data: ${fromBase64urlToBase64(opEncoded.args)}`,
        `entry point: ${opEncoded.entry_point}`,
        "transaction reverted: from has not authorized transfer",
      ],
    })
  );

  // note that this transaction was signed by the wallet, and even
  // with that it was rejected because the authorize function
  // rejected it
});

it("should call the authorize function of a smart wallet initiated by a third party", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletAccount,
    provider: localKoinos.getProvider(),
  });

  // set allowance in the smart wallet
  await tx.pushOperation(testWallet.functions["set_allowance"], {
    value: true,
  });

  // call third party contract
  await tx.pushOperation(testThirdParty.functions["operate_external_assets"], {
    account: testWalletAccount.getAddress(),
  });
  const opEncoded = (
    await token.encodeOperation({
      name: "transfer",
      args: {
        from: testWalletAccount.getAddress(),
        to: testThirdPartyAccount.getAddress(),
        value: "10",
      },
    })
  ).call_contract;

  const receipt = await tx.send();
  expect(receipt).toStrictEqual(
    expect.objectContaining({
      logs: [
        "authorize called",
        "type: 0",
        `caller: ${testThirdPartyAccount.getAddress()}`,
        `contract id: ${opEncoded.contract_id}`,
        `data: ${fromBase64urlToBase64(opEncoded.args)}`,
        `entry point: ${opEncoded.entry_point}`,
      ],
    }) as unknown as TransactionReceipt
  );
});

it("should work when the caller is the account", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testUserAccount,
    provider: localKoinos.getProvider(),
  });

  // call Alice's contract to call test contract
  await tx.pushOperation(testWallet.functions["direct_call"]);

  const receipt = await tx.send();
  expect(receipt).toStrictEqual(
    expect.objectContaining({
      events: expect.arrayContaining([]),
    }) as unknown as TransactionReceipt
  );

  // note the the authorize function is not called
  // because contract wallet is the caller
});
