import { getContract } from "./getContract";

export async function deployContract(
  pathContract: string,
  networkName: string = "harbinger"
) {
  const contract = getContract(pathContract, { networkName });

  const { receipt, transaction } = await contract.deploy({
    abi: JSON.stringify(contract.abi),
  });

  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction!.wait("byBlock", 60000);
  console.log(
    `${pathContract} contract ${contract.getId()} uploaded in block number ${blockNumber} (${networkName})`
  );
}
