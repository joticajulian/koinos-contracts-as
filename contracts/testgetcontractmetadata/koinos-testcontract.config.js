const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "TestContract",
  proto: ["./proto/getcontractmetadata.proto"],
  files: ["./TestContract.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path: "../../koinosbox-proto",
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
};
