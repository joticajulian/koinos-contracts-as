const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Burnkoinhelper",
  version: "1.0.2",
  proto: ["./proto/burnkoin.proto"],
  files: ["./Burnkoinhelper.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path:
        process.env.IMPORT_KOINOSBOX_PROTO_FROM_NODE_MODULES === "true"
          ? "../../node_modules/@koinosbox/contracts/koinosbox-proto"
          : "../../koinosbox-proto",
      exclude: ["burnkoinhelper"],
    },
    {
      name: "@koinos/sdk-as",
      path: "../../node_modules/koinos-precompiler-as/koinos-proto/koinos",
    },
    {
      name: "__",
      path: "../../node_modules/koinos-precompiler-as/koinos-proto/google",
    },
  ],
  deployOptions: {
    authorizesCallContract: true,
    authorizesTransactionApplication: true,
    authorizesUploadContract: true,
  },
  networks: {
    harbinger: {
      rpcNodes: [
        "https://harbinger-api.koinos.io",
        "https://testnet.koinosblocks.com",
      ],
      accounts: {
        manaSharer: {
          privateKey: process.env.HARBINGER_MANA_SHARER_PRIVATE_KEY,
        },
        contract: {
          privateKey:
            process.env.HARBINGER_BURNKOIN_HELPER_CONTRACT_PRIVATE_KEY,
          id: process.env.HARBINGER_BURNKOIN_HELPER_CONTRACT_ID,
        },
      },
    },
    mainnet: {
      rpcNodes: ["https://api.koinos.io", "https://api.koinosblocks.com"],
      accounts: {
        manaSharer: {
          privateKey: process.env.MAINNET_MANA_SHARER_PRIVATE_KEY,
        },
        contract: {
          privateKey: process.env.MAINNET_BURNKOIN_HELPER_CONTRACT_PRIVATE_KEY,
          id: process.env.MAINNET_BURNKOIN_HELPER_CONTRACT_ID,
        },
      },
    },
  },
};
