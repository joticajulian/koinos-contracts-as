import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as _checkauthorityAbi from "../build/checkauthority-abi.json";
import * as _testContractAbi from "../build/testcontract-abi.json";
import * as _testWalletAbi from "../build/testwallet-abi.json";

jest.setTimeout(600000);

const localKoinos = new LocalKoinos();

const checkauthorityAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testContractAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const testWalletAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const checkauthorityAbi = _checkauthorityAbi as Abi;
const testContractAbi = _testContractAbi as Abi;
const testWalletAbi = _testWalletAbi as Abi;

const testContract = new Contract({
  id: testContractAccount.getAddress(),
  abi: testContractAbi,
  provider: localKoinos.getProvider(),
});

const testWallet = new Contract({
  id: testWalletAccount.getAddress(),
  abi: testWalletAbi,
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
    testWalletAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/testwallet.wasm"),
    testWalletAbi,
    {},
    { authorizesCallContract: true }
  );

  // set check_authority contract as system contract and system call
  await localKoinos.setSystemContract(checkauthorityAccount.address, true);
  await localKoinos.setSystemCall(
    607,
    checkauthorityAccount.address,
    checkauthorityAbi.methods["check_authority"].entry_point
  );
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should call the authorize function of a smart wallet", async () => {
  expect.assertions(1);

  const tx = new Transaction({
    signer: testWalletAccount,
    provider: localKoinos.getProvider(),
  });

  // set allowance in the smart wallet
  await tx.pushOperation(testWallet.functions["set_allowance"], {
    value: true,
  });

  // call test contract
  await tx.pushOperation(testContract.functions["my_operation"], {
    account: testWalletAccount.getAddress(),
  });
  const myOpEncoded = tx.transaction.operations[1].call_contract;

  const receipt = await tx.send();
  expect(receipt).toStrictEqual({
    id: expect.any(String),
    payer: testWalletAccount.address,
    max_payer_rc: expect.any(String),
    rc_limit: expect.any(String),
    rc_used: expect.any(String),
    disk_storage_used: expect.any(String),
    network_bandwidth_used: expect.any(String),
    compute_bandwidth_used: expect.any(String),
    logs: [
      "authorize called",
      "type: 0",
      "no caller",
      `contract id: ${myOpEncoded.contract_id}`,
      `data: ${myOpEncoded.args
        .replace(/\+/g, "_")
        .replace(/\//g, "-")
        .replace(/=+$/g, "")}`,
      `entry point: ${myOpEncoded.entry_point}`,
    ],
  } as unknown as TransactionReceipt);
});
