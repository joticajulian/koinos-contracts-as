const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Token",
  version: "1.0.1",
  proto: ["./proto/token.proto"],
  files: ["./Token.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path:
        process.env.IMPORT_KOINOSBOX_PROTO_FROM_NODE_MODULES === "true"
          ? "../../node_modules/@koinosbox/contracts/koinosbox-proto"
          : "../../koinosbox-proto",
      exclude: ["token"],
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
