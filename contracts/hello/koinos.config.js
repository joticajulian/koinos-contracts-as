module.exports = {
  class: "Hello",
  proto: ["./proto/hello.proto"],
  files: ["./Hello.ts"],
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
};
