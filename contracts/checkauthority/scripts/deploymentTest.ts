import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import { Signer, Contract, Provider } from "koilib";
import testContractAbi from "../build/testcontract-abi.json";
import testThirdPartyAbi from "../build/testthirdparty-abi.json";
import testWalletAbi from "../build/testwallet-abi.json";
import koinosConfig from "../koinos.config.js";

const [inputNetworkName] = process.argv.slice(2);

async function main() {
  const networkName = inputNetworkName || "harbinger";
  const network = koinosConfig.networks[networkName];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  const testContractAccount = new Signer({
    privateKey: randomBytes(32).toString("hex"),
    provider,
  });
  const testThirdPartyAccount = new Signer({
    privateKey: randomBytes(32).toString("hex"),
    provider,
  });
  const testWalletAccount = new Signer({
    privateKey: randomBytes(32).toString("hex"),
    provider,
  });

  const testContract = new Contract({
    signer: testContractAccount,
    provider,
    abi: testContractAbi,
    bytecode: fs.readFileSync(
      path.join(__dirname, "../build/release/testcontract.wasm")
    ),
    options: {
      payer: network.accounts.manaSharer.id,
      rcLimit: "10000000000",
    },
  });

  const testThirdParty = new Contract({
    signer: testThirdPartyAccount,
    provider,
    abi: testThirdPartyAbi,
    bytecode: fs.readFileSync(
      path.join(__dirname, "../build/release/testthirdparty.wasm")
    ),
    options: {
      payer: network.accounts.manaSharer.id,
      rcLimit: "10000000000",
    },
  });

  const testWallet = new Contract({
    signer: testWalletAccount,
    provider,
    abi: testWalletAbi,
    bytecode: fs.readFileSync(
      path.join(__dirname, "../build/release/testwallet.wasm")
    ),
    options: {
      payer: network.accounts.manaSharer.id,
      rcLimit: "10000000000",
    },
  });

  const { receipt: r1, transaction: t1 } = await testContract.deploy({
    abi: JSON.stringify(testContractAbi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(r1);
  const { blockNumber: b1 } = await t1.wait("byBlock", 60000);
  console.log(
    `Test Contract ${testContractAccount.address} uploaded in block number ${b1} (${networkName})`
  );

  const { receipt: r2, transaction: t2 } = await testThirdParty.deploy({
    abi: JSON.stringify(testThirdPartyAbi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(r2);
  const { blockNumber: b2 } = await t2.wait("byBlock", 60000);
  console.log(
    `Test Third Party ${testThirdPartyAccount.address} uploaded in block number ${b2} (${networkName})`
  );

  const { receipt: r3, transaction: t3 } = await testWallet.deploy({
    abi: JSON.stringify(testWalletAbi),
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(r3);
  const { blockNumber: b3 } = await t3.wait("byBlock", 60000);
  console.log(
    `Test Contract ${testContractAccount.address} uploaded in block number ${b1} (${networkName})`
  );
  console.log(
    `Test Third Party ${testThirdPartyAccount.address} uploaded in block number ${b2} (${networkName})`
  );
  console.log(
    `Test Wallet ${testWalletAccount.address} uploaded in block number ${b3} (${networkName})`
  );
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
