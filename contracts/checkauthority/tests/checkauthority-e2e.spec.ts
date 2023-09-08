import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as _checkauthorityAbi from "../build/checkauthority-abi.json";
import * as _testContractAbi from "../build/testcontract-abi.json";
import * as _testWalletAbi from "../build/testwallet-abi.json";
import * as _testThirdPartyAbi from "../build/testthirdparty-abi.json";

jest.setTimeout(600000);

function fromBase64urlToBase64(data: string): string {
  return data.replace(/\_/g, "/").replace(/\-/g, "+");
}

const localKoinos = new LocalKoinos();

const checkauthorityAbi = _checkauthorityAbi as Abi;
const testContractAbi = _testContractAbi as Abi;
const testWalletAbi = _testWalletAbi as Abi;
const testThirdPartyAbi = _testThirdPartyAbi as Abi;

const checkauthorityAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testContractAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testWalletAliceAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testWalletBobAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testThirdPartyAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testContract = new Contract({
  id: testContractAccount.getAddress(),
  abi: testContractAbi,
  provider: localKoinos.getProvider(),
});

const testWalletAlice = new Contract({
  id: testWalletAliceAccount.getAddress(),
  abi: testWalletAbi,
  provider: localKoinos.getProvider(),
});

const testWalletBob = new Contract({
  id: testWalletAliceAccount.getAddress(),
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
    path.join(__dirname, "../build/release/checkauthority.wasm"),
    checkauthorityAbi
  );
  await localKoinos.deployContract(
    testContractAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/testcontract.wasm"),
    testContractAbi
  );
  await localKoinos.deployContract(
    testWalletAliceAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/testwallet.wasm"),
    testWalletAbi,
    {},
    // Alice override the authorize function
    { authorizesCallContract: true }
  );
  await localKoinos.deployContract(
    testWalletBobAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/testwallet.wasm"),
    testWalletAbi,
    {},
    // Bob acts like a typical account, he doesn't override
    // the authorize function
    { authorizesCallContract: false }
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

  // setup contracts
  const tx = new Transaction({
    signer: testWalletAliceAccount,
    provider: localKoinos.getProvider(),
  });

  // set test contract in third party contract
  await tx.pushOperation(testThirdParty.functions["set_test_contract_id"], {
    account: testContractAccount.address,
  });

  // set test contract in Alice
  await tx.pushOperation(testWalletAlice.functions["set_test_contract_id"], {
    account: testContractAccount.address,
  });

  await tx.send();
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should fail when the signature is invalid", async () => {
  expect.assertions(1);

  // Alice will try to impersonate Bob

  const tx = new Transaction({
    // signed by Alice
    signer: testWalletAliceAccount,
    provider: localKoinos.getProvider(),
  });

  // call test contract
  await tx.pushOperation(testContract.functions["operate_assets"], {
    // try to access Bob's assets
    account: testWalletBobAccount.getAddress(),
  });

  await expect(tx.send()).rejects.toThrow(
    JSON.stringify({
      error: "not authorized",
      code: 1,
      logs: ["transaction reverted: not authorized"],
    })
  );
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
    signer: testWalletBobAccount,
    provider: localKoinos.getProvider(),
  });

  // call third party contract
  await tx.pushOperation(testThirdParty.functions["operate_external_assets"], {
    // try to access Bob's assets
    account: testWalletBobAccount.getAddress(),
  });

  await expect(tx.send()).rejects.toThrow(
    JSON.stringify({
      error: "not authorized",
      code: 1,
      logs: ["transaction reverted: not authorized"],
    })
  );
});

it("should fail when the smart wallet rejects the operation", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletAliceAccount,
    provider: localKoinos.getProvider(),
  });

  // remove allowance in the smart wallet
  await tx.pushOperation(testWalletAlice.functions["set_allowance"], {
    value: false,
  });

  // call test contract
  await tx.pushOperation(testContract.functions["operate_assets"], {
    account: testWalletAliceAccount.getAddress(),
  });
  const opEncoded = tx.transaction.operations[1].call_contract;

  await expect(tx.send()).rejects.toThrow(
    JSON.stringify({
      error: "not authorized",
      code: 1,
      logs: [
        "authorize called",
        "type: 0",
        "no caller",
        `contract id: ${opEncoded.contract_id}`,
        `data: ${fromBase64urlToBase64(opEncoded.args)}`,
        `entry point: ${opEncoded.entry_point}`,
        "transaction reverted: not authorized",
      ],
    })
  );

  // note that this transaction was signed by Alice, and even
  // with that it was rejected because the authorize function
  // rejected it
});

it("should call the authorize function of a smart wallet", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletAliceAccount,
    provider: localKoinos.getProvider(),
  });

  // set allowance in the smart wallet
  await tx.pushOperation(testWalletAlice.functions["set_allowance"], {
    value: true,
  });

  // call test contract
  await tx.pushOperation(testContract.functions["operate_assets"], {
    account: testWalletAliceAccount.getAddress(),
  });
  const opEncoded = tx.transaction.operations[1].call_contract;

  const receipt = await tx.send();
  expect(receipt).toStrictEqual(
    expect.objectContaining({
      logs: [
        "authorize called",
        "type: 0",
        "no caller",
        `contract id: ${opEncoded.contract_id}`,
        `data: ${fromBase64urlToBase64(opEncoded.args)}`,
        `entry point: ${opEncoded.entry_point}`,
        "authorized to operate with the assets",
      ],
    }) as unknown as TransactionReceipt
  );
});

it("should call the authorize function of a smart wallet initiated by a third party", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletAliceAccount,
    provider: localKoinos.getProvider(),
  });

  // set allowance in the smart wallet
  await tx.pushOperation(testWalletAlice.functions["set_allowance"], {
    value: true,
  });

  // call third party contract
  await tx.pushOperation(testThirdParty.functions["operate_external_assets"], {
    account: testWalletAliceAccount.getAddress(),
  });
  const opEncoded = (
    await testContract.encodeOperation({
      name: "operate_assets",
      args: { account: testWalletAliceAccount.getAddress() },
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
        "authorized to operate with the assets",
      ],
    }) as unknown as TransactionReceipt
  );

  // note that unlike Bob, Alice has a smart wallet that allows
  // the third party to access the assets.
});

it("should work if the signature is valid", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletBobAccount,
    provider: localKoinos.getProvider(),
  });

  // call test contract
  await tx.pushOperation(testContract.functions["operate_assets"], {
    account: testWalletBobAccount.getAddress(),
  });

  const receipt = await tx.send();
  expect(receipt).toStrictEqual(
    expect.objectContaining({
      logs: ["authorized to operate with the assets"],
    }) as unknown as TransactionReceipt
  );

  // note that the smart wallet of Bob is not called
  // because he didn't override the authorize function. Then
  // it works only with his signature.
});

it("should work when the caller is the account", async () => {
  expect.assertions(1);

  // In this test Bob calls Alice's contract,
  // and Alice's contract calls the testContract
  // directly. Since Alice is the caller it should
  // work.

  const tx = new Transaction({
    signer: testWalletBobAccount,
    provider: localKoinos.getProvider(),
  });

  // call Alice's contract to call test contract
  await tx.pushOperation(testWalletAlice.functions["direct_call"]);

  const receipt = await tx.send();
  expect(receipt).toStrictEqual(
    expect.objectContaining({
      logs: ["authorized to operate with the assets"],
    }) as unknown as TransactionReceipt
  );

  // note the the authorize function is not called
  // because Alice is the caller
});
