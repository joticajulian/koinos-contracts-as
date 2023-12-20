const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../.env") });

module.exports = {
  class: "Nicknames",
  version: "2.2.0",
  proto: ["./proto/nicknames.proto"],
  files: ["./Nicknames.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  filesImport: [
    {
      dependency: "@koinosbox/contracts",
      path: "../../node_modules/@koinosbox/contracts/assembly/nft/Nft.ts",
    },
  ],
  protoImport: [
    {
      name: "@koinosbox/contracts",
      path: "../../koinosbox-proto",
      exclude: ["nicknames"],
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
