import fs from "fs";
import crypto from "crypto";
import path from "path";
import { Signer, Contract, Provider, Transaction } from "koilib";
import abi from "../build/checkauthority-abi.json";
import koinosConfig from "../koinos.config.js";
import { Abi } from "koilib/lib/interface";

const HARBINGER_GOVERNANCE_CONTRACT_ID = "17MjUXDCuTX1p9Kyqy48SQkkPfKScoggo";
const MAINNET_GOVERNANCE_CONTRACT_ID = "19qj51eTbSFJYU7ZagudkpxPgNSzPMfdPX";

const [inputNetworkName] = process.argv.slice(2);

async function main() {
  const networkName = inputNetworkName || "harbinger";
  const network = koinosConfig.networks[networkName];
  if (!network) throw new Error(`network ${networkName} not found`);
  const provider = new Provider(network.rpcNodes);
  const signer = Signer.fromWif(network.accounts.manaSharer.privateKey);
  signer.provider = provider;
  const contract = new Contract({
    id:
      networkName === "harbinger"
        ? HARBINGER_GOVERNANCE_CONTRACT_ID
        : MAINNET_GOVERNANCE_CONTRACT_ID,
    signer,
    provider,
    options: {
      payer: network.accounts.manaSharer.id,
      rcLimit: "10000000000",
    },
    abi: {
      methods: {
        submit_proposal: {
          argument: "submit_proposal_arguments",
          return: "",
          description: "Submits a proposal",
          entry_point: 0xe74b785c,
          read_only: false,
        },
      },
      koilib_types: {
        nested: {
          submit_proposal_arguments: {
            fields: {
              operations: {
                rule: "repeated",
                type: "operation",
                id: 1,
              },
              operation_merkle_root: {
                type: "bytes",
                id: 2,
              },
              fee: {
                type: "uint64",
                id: 3,
                options: {
                  jstype: "JS_STRING",
                },
              },
            },
          },
          contract_call_bundle: {
            fields: {
              contract_id: {
                type: "bytes",
                id: 1,
                options: {
                  "(btype)": "CONTRACT_ID",
                },
              },
              entry_point: {
                type: "uint32",
                id: 2,
              },
            },
          },
          system_call_target: {
            oneofs: {
              target: {
                oneof: ["thunk_id", "system_call_bundle"],
              },
            },
            fields: {
              thunk_id: {
                type: "uint32",
                id: 1,
              },
              system_call_bundle: {
                type: "contract_call_bundle",
                id: 2,
              },
            },
          },
          upload_contract_operation: {
            fields: {
              contract_id: {
                type: "bytes",
                id: 1,
                options: {
                  "(btype)": "CONTRACT_ID",
                },
              },
              bytecode: {
                type: "bytes",
                id: 2,
              },
              abi: {
                type: "string",
                id: 3,
              },
              authorizes_call_contract: {
                type: "bool",
                id: 4,
              },
              authorizes_transaction_application: {
                type: "bool",
                id: 5,
              },
              authorizes_upload_contract: {
                type: "bool",
                id: 6,
              },
            },
          },
          call_contract_operation: {
            fields: {
              contract_id: {
                type: "bytes",
                id: 1,
                options: {
                  "(btype)": "CONTRACT_ID",
                },
              },
              entry_point: {
                type: "uint32",
                id: 2,
              },
              args: {
                type: "bytes",
                id: 3,
              },
            },
          },
          set_system_call_operation: {
            fields: {
              call_id: {
                type: "uint32",
                id: 1,
              },
              target: {
                type: "system_call_target",
                id: 2,
              },
            },
          },
          set_system_contract_operation: {
            fields: {
              contract_id: {
                type: "bytes",
                id: 1,
                options: {
                  "(btype)": "CONTRACT_ID",
                },
              },
              system_contract: {
                type: "bool",
                id: 2,
              },
            },
          },
          operation: {
            oneofs: {
              op: {
                oneof: [
                  "upload_contract",
                  "call_contract",
                  "set_system_call",
                  "set_system_contract",
                ],
              },
            },
            fields: {
              upload_contract: {
                type: "upload_contract_operation",
                id: 1,
              },
              call_contract: {
                type: "call_contract_operation",
                id: 2,
              },
              set_system_call: {
                type: "set_system_call_operation",
                id: 3,
              },
              set_system_contract: {
                type: "set_system_contract_operation",
                id: 4,
              },
            },
          },
        },
      },
    },
  });
  // await contract.fetchAbi(); // do not work

  const tx = new Transaction({ provider, signer });
  await tx.pushOperation({
    set_system_contract: {
      contract_id: network.accounts.contract.id,
      system_contract: true,
    },
  });
  await tx.pushOperation({
    set_system_call: {
      call_id: 607,
      target: {
        system_call_bundle: {
          contract_id: network.accounts.contract.id,
          entry_point: (abi as Abi).methods["check_authority"].entry_point,
        },
      },
    },
  });
  await tx.prepare();

  const { receipt, transaction } = await contract.functions.submit_proposal({
    operations: tx.transaction.operations,
    operation_merkle_root: tx.transaction.header.operation_merkle_root,
    fee: "2000000000",
  });
  console.log("Transaction submitted. Receipt: ");
  console.log(receipt);
  const { blockNumber } = await transaction.wait("byBlock", 60000);
  console.log(
    `Proposal submitted in block number ${blockNumber} (${networkName})`
  );
}

main()
  .then(() => {})
  .catch((error) => console.error(error));
