import crypto from "crypto";
import { Contract, Transaction, utils } from "koilib";
import { getContract } from "../getContract";

function getTokenId(name: string): string {
  return `0x${Buffer.from(name).toString("hex")}`;
}

function getEntryPoint(fnName: string): string {
  return `0x${crypto
    .createHash("sha256")
    .update(fnName)
    .digest("hex")
    .slice(0, 8)}`;
}

const [networkName] = process.argv.slice(2);
export async function main() {
  const nicknames = getContract("nicknames", { networkName });
  nicknames.options.onlyOperation = true;

  const transaction = new Transaction({
    provider: nicknames.provider,
    signer: nicknames.signer,
    options: nicknames.options,
  });

  await transaction.pushOperation(nicknames.functions.set_tabi, {
    token_id: getTokenId("koin"),
    tabi: {
      items: [
        {
          pattern: "%1_selfaddress_transfer %3_u64_8 KOIN to %2_address",
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern:
            "%1_selfaddress_approve %2_address to transfer up to %3_u64_8 KOIN",
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern: "mint %2_u64_8 KOIN to %1_address",
          entry_point: getEntryPoint("mint"),
        },
        {
          pattern: "%1_selfaddress_burn %2_u64_8 KOIN",
          entry_point: getEntryPoint("burn"),
        },
        {
          pattern: "transfer %3_u64_8 KOIN from %1_address to %2_address",
          entry_point: getEntryPoint("transfer"),
        },
        {
          pattern:
            "approve %2_address to transfer up to %3_u64_8 KOIN from %1_address",
          entry_point: getEntryPoint("approve"),
        },
        {
          pattern: "burn %2_u64_8 KOIN from %1_address",
          entry_point: getEntryPoint("burn"),
        },
      ],
    },
  });

  const receipt = await transaction.send();

  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
}

main().catch(console.error);
