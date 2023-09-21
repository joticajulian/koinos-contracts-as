const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "CheckAuthority",
  proto: ["./proto/checkauthority.proto"],
  files: ["./CheckAuthority.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  protoImport: [
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
          id: process.env.HARBINGER_MANA_SHARER_ID,
        },
        contract: {
          privateKey:
            process.env.HARBINGER_CHECK_AUTHORITY_CONTRACT_PRIVATE_KEY,
          id: process.env.HARBINGER_CHECK_AUTHORITY_CONTRACT_ID,
        },
      },
    },
    mainnet: {
      rpcNodes: ["https://api.koinos.io", "https://api.koinosblocks.com"],
      accounts: {
        manaSharer: {
          privateKey: process.env.MAINNET_MANA_SHARER_PRIVATE_KEY,
          id: process.env.MAINNET_MANA_SHARER_ID,
        },
        contract: {
          privateKey: process.env.MAINNET_CHECK_AUTHORITY_CONTRACT_PRIVATE_KEY,
          id: process.env.MAINNET_CHECK_AUTHORITY_CONTRACT_ID,
        },
      },
    },
  },
};
