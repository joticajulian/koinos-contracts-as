import { Contract, Provider, Signer } from "koilib";
import * as dotenv from "dotenv";
import helloAbi from "../build/hello-abi.json";

dotenv.config();

const privateKeyContract = process.env.PRIVATE_KEY_CONTRACT ?? "";

async function main() {
  const contractId = Signer.fromWif(privateKeyContract).address;
  const contract = new Contract({
    id: contractId,
    // provider: new Provider(["http://api.koinos.io:8080"]),
    provider: new Provider(["https://api.koinosblocks.com"]),
    abi: helloAbi,
  }).functions;

  const { result } = await contract.say_hello();
  console.log(result);
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
