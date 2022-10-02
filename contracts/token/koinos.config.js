module.exports = {
  class: "Token",
  proto: ["./proto/token.proto"],
  files: ["./Token.ts"],
  sourceDir: "./assembly",
  buildDir: "./build",
  koinosProtoDir: "../../node_modules/koinos-precompiler-as/koinos-proto",
};
