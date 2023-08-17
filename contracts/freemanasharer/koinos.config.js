const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "FreeManaSharer",
  proto: ["./proto/freemanasharer.proto"],
  files: ["./FreeManaSharer.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path: "../../koinosbox-proto"
    },
    {
      name: "@koinos/sdk-as",
      path: "../../node_modules/koinos-precompiler-as/koinos-proto/koinos"
    },
    {
      name: "__",
      path: "../../node_modules/koinos-precompiler-as/koinos-proto/google"
    }
  ],
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
            process.env.HARBINGER_FREE_MANA_SHARER_CONTRACT_PRIVATE_KEY,
          id: process.env.HARBINGER_FREE_MANA_SHARER_CONTRACT_ID,
        },
      },
    },
    mainnet: {
      rpcNodes: ["https://api.koinosblocks.com", "https://api.koinos.io"],
      accounts: {
        manaSharer: {
          privateKey: process.env.MAINNET_MANA_SHARER_PRIVATE_KEY,
        },
        contract: {
          privateKey: process.env.MAINNET_FREE_MANA_SHARER_CONTRACT_PRIVATE_KEY,
          id: process.env.MAINNET_FREE_MANA_SHARER_CONTRACT_ID,
        },
      },
    },
  },
};
