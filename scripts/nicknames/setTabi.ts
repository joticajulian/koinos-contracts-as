import { Transaction } from "koilib";
import { getContract } from "../getContract";
import {
  tabiPayloadGenericNft,
  tabiPayloadGenericToken,
  tabiPayloadNicknames,
  tabiPayloadPob,
  tabiPayloadToken,
  tabiPayloadFogata,
} from "./tabis";

const [networkName] = process.argv.slice(2);
export async function main() {
  const nicknames = getContract("nicknames", { networkName });
  nicknames.options.onlyOperation = true;

  const tx = new Transaction({
    provider: nicknames.provider,
    signer: nicknames.signer,
    options: nicknames.options,
  });

  const koinSymbol = networkName === "harbinger" ? "tKOIN" : "KOIN";

  const { set_tabi: setTabi } = nicknames.functions;

  // await tx.pushOperation(setTabi, tabiPayloadToken("koin", koinSymbol));
  // await tx.pushOperation(setTabi, tabiPayloadToken("vhp", "VHP"));
  // await tx.pushOperation(setTabi, tabiPayloadPob(koinSymbol));
  // await tx.pushOperation(setTabi, tabiPayloadNicknames());
  // await tx.pushOperation(setTabi, tabiPayloadGenericNft());
  // await tx.pushOperation(setTabi, tabiPayloadGenericToken());
  // await tx.pushOperation(setTabi, tabiPayloadFogata());

  const receipt = await tx.send();

  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
}

main().catch(console.error);
