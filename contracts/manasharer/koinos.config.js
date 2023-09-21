const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "ManaSharer",
  proto: ["./proto/common.proto"],
  files: ["./ManaSharer.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path: "../../koinosbox-proto",
      exclude: ["manasharer"],
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
    authorizesTransactionApplication: true,
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
          managers: process.env.HARBINGER_MANAGERS,
        },
      },
    },
    mainnet: {
      rpcNodes: ["https://api.koinosblocks.com", "https://api.koinos.io"],
      accounts: {
        manaSharer: {
          privateKey: process.env.MAINNET_MANA_SHARER_PRIVATE_KEY,
          managers: process.env.MAINNET_MANAGERS,
        },
      },
    },
  },
};
