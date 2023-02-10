import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import * as dotenv from "dotenv";
import abi from "../build/manasharer-abi.json";
import koinosConfig from "../koinos.config.js";
import { contractDetails } from "../../utils";

dotenv.config();

const [inputNetworkName] = process.argv.slice(2);

async function main() {
  const networkName = inputNetworkName || "harbinger";
  const network = koinosConfig.networks[networkName];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  const manaSharer = Signer.fromWif(
    network.accounts.manaSharer.privateKey
  );
  manaSharer.provider = provider;
  
  const filename = "manasharer.wasm";
  const wasmFile = path.join(__dirname, "../build/release", filename);

  const contract = new Contract({
    id: manaSharer.address,
    abi,
    signer: manaSharer,
    provider,
    bytecode: fs.readFileSync(wasmFile),
  });

  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(abi),
    authorizesTransactionApplication: true,
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction.wait("byBlock", 60000);
  console.log({
    contract: "manasharer",
    address: contract.getId(),
    file: wasmFile,
    ...contractDetails(contract.bytecode),
  });
  console.log(
    `Contract uploaded in block number ${blockNumber} (${networkName})`
  );
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
