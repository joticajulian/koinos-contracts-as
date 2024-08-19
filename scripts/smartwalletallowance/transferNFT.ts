import { Contract, utils } from "koilib";
import { getContract } from "../getContract";

const [networkName] = process.argv.slice(2);
export async function main() {
  const contract = getContract("smartwalletallowance", { networkName });

  const pobContract = new Contract({
    id: "1MAbK5pYkhp9yHnfhYamC3tfSLmVRTDjd9",
    signer: contract.signer,
    provider: contract.provider,
  });
  await pobContract.fetchAbi();
  Object.keys(pobContract.abi.methods).forEach((m) => {
    pobContract.abi.methods[m].entry_point = Number(
      pobContract.abi.methods[m]["entry-point"]
    );
    pobContract.abi.methods[m].read_only =
      pobContract.abi.methods[m]["read-only"];
  });

  const koinContract = new Contract({
    id: "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju",
    abi: utils.tokenAbi,
  });

  const { operation: burn } = await koinContract.functions.mint(
    {
      to: koinContract.getId(), // contract.getId(),
      value: 99,
    },
    { onlyOperation: true }
  );

  const { operation: allowance } = await contract.functions.set_allowance(
    {
      type: 4, // burn
      contract_id: "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju", // koin
      entry_point: 0x859facc5,
      caller: pobContract.getId(),
      data: burn.call_contract.args,
    },
    { onlyOperation: true }
  );

  const { transaction, receipt } = await pobContract.functions.burn(
    {
      burn_address: contract.getId(),
      vhp_address: contract.getId(),
      token_amount: 100,
    },
    {
      previousOperations: [allowance],
      broadcast: false,
    }
  );

  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
}

main().catch(console.error);
