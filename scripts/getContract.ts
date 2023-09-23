import fs from "fs";
import path from "path";
import { Signer, Contract, Provider } from "koilib";
import networks from "./networks.js";

/**
 * Get contract
 * @param contractName
 * @param options
 *
 * ```ts
 * // Default options:
 * // - token for "harbinger"
 * // - skipPrivateKey false (load private key of contract)
 * // - skipBytecode false
 * // - skipAbi false
 * getContract("token");
 *
 * // Custom options:
 * // - token for "mainnet"
 * // - skipPrivateKey true (load the ID of the contract)
 * // - skipBytecode true
 * // - skipAbi true
 * getContract("token", {
 *   skipPrivateKey: true,
 *   skipBytecode: true,
 *   skipAbi: true,
 * });
 *
 * // You can also target a different contract
 * getContract("token/testThirdParty");
 * ```
 */
export function getContract(
  pathContract: string,
  options?: {
    networkName?: string;
    skipPrivateKey?: boolean;
    skipBytecode?: boolean;
    skipAbi?: boolean;
  }
) {
  const networkName = options?.networkName || "harbinger";
  const skipPrivateKey = options && options.skipPrivateKey;
  const skipBytecode = options && options.skipBytecode;
  const skipAbi = options && options.skipAbi;

  const network = networks[networkName];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  let contractAccount: Signer;
  let contractId: string;
  let bytecode: Uint8Array;
  let abiString: string;

  let [projectName, contractName] = pathContract.split("/");
  if (!contractName) contractName = projectName;
  if (skipPrivateKey) {
    contractId = network.accounts[pathContract].id;
  } else {
    contractAccount = Signer.fromWif(network.accounts[pathContract].privateKey);
    contractAccount.provider = provider;
  }

  if (!skipBytecode) {
    bytecode = fs.readFileSync(
      path.join(
        __dirname,
        "../contracts",
        projectName,
        `build/release/${contractName}.wasm`
      )
    );
  }

  if (!skipAbi) {
    abiString = fs.readFileSync(
      path.join(
        __dirname,
        "../contracts",
        projectName,
        `build/${contractName}-abi.json`
      ),
      "utf8"
    );
  }

  return new Contract({
    provider,
    ...(skipPrivateKey && { id: contractId }),
    ...(!skipPrivateKey && { signer: contractAccount }),
    ...(!skipAbi && { abi: JSON.parse(abiString) }),
    ...(!skipBytecode && { bytecode }),
    options: {
      payer: network.accounts.freeMana.id,
      rcLimit: "10000000000",
    },
  });
}
