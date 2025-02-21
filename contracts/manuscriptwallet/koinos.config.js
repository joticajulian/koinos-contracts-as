const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "ManuscriptWallet",
  version: "1.0.0",
  supportAbi1: true,
  proto: ["./proto/manuscriptwallet.proto"],
  files: ["./ManuscriptWallet.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  filesImport: [
    {
      dependency: "@koinosbox/contracts",
      path: "../../node_modules/@koinosbox/contracts/assembly/smartwalletallowance/SmartWalletAllowance.ts",
    },
  ],
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path:
        process.env.IMPORT_KOINOSBOX_PROTO_FROM_NODE_MODULES === "true"
          ? "../../node_modules/@koinosbox/contracts/koinosbox-proto"
          : "../../koinosbox-proto",
      exclude: ["manuscriptwallet"],
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
    authorizesTransactionApplication: false,
    authorizesUploadContract: false,
  },
};
