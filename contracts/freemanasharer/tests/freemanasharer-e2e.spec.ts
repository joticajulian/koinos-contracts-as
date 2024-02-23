import { LocalKoinos } from "@roamin/local-koinos";
import { Contract, Signer, Transaction } from "koilib";
import path from "path";
import { Abi, TransactionReceipt } from "koilib/lib/interface";
import { randomBytes } from "crypto";
import { beforeAll, afterAll, it, expect } from "@jest/globals";
import * as abi from "../build/freemanasharer-abi.json";

jest.setTimeout(600000);

function fromBase64urlToBase64(data: string): string {
  return data.replace(/\_/g, "/").replace(/\-/g, "+");
}

const localKoinos = new LocalKoinos();
const freemanasharerAbi = abi as Abi;

const freemanasharerAccount = new Signer({
  privateKey: randomBytes(32).toString("hex"),
  provider: localKoinos.getProvider(),
});

const freemanasharer = new Contract({
  id: freemanasharerAccount.getAddress(),
  abi: freemanasharerAbi,
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
    freemanasharerAccount.getPrivateKey("wif"),
    path.join(__dirname, "../build/release/freemanasharer.wasm"),
    freemanasharerAbi
  );
});

afterAll(() => {
  // stop local-koinos node
  localKoinos.stopNode();
});

it("should work", async () => {
  // TODO
});
