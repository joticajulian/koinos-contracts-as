import path from "path";
import { getContract } from "./getContract";

export async function deployContract(
  pathContract: string,
  networkName: string = "harbinger"
) {
  let [projectName, contractName] = pathContract.split("/");
  if (!contractName) contractName = projectName;

  const contract = getContract(pathContract, { networkName });

  const configJsFile = path.join(
    __dirname,
    "../contracts",
    projectName,
    contractName === projectName
      ? "koinos.config.js"
      : `koinos-${contractName}.config.js`
  );
  const configJs = require(configJsFile);
  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(contract.abi),
    ...configJs.deployOptions,
  });

  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction!.wait("byBlock", 60000);
  console.log(
    `${pathContract} contract ${contract.getId()} uploaded in block number ${blockNumber} (${networkName})`
  );
}
