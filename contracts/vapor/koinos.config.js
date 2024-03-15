const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Vapor",
  version: "2.0.0",
  supportAbi1: true,
  proto: ["./proto/vapor.proto"],
  files: ["./Vapor.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  filesImport: [
    {
      dependency: "@koinosbox/contracts",
      path: "../../node_modules/@koinosbox/contracts/assembly/token/Token.ts",
    },
  ],
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path:
        process.env.IMPORT_KOINOSBOX_PROTO_FROM_NODE_MODULES === "true"
          ? "../../node_modules/@koinosbox/contracts/koinosbox-proto"
          : "../../koinosbox-proto",
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
  deployOptions: {},
};
