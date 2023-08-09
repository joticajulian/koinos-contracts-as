const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

if (!fs.existsSync("./assembly")) {
  fs.mkdirSync("assembly");
}

let index = "";
const contracts = fs.readdirSync("./contracts", { withFileTypes: true });
contracts.forEach((contract) => {
  if (!contract.isDirectory()) return;
  const src = path.join("./contracts", contract.name, "./build");
  const dest = path.join("./assembly", contract.name);
  fs.rmdirSync(dest, { recursive: true, force: true });
  fse.copySync(src, dest);

  if (fs.existsSync(path.join(dest, "__tests__"))) {
    fs.rmdirSync(path.join(dest, "__tests__"), {
      recursive: true,
      force: true,
    });
  }

  if (fs.existsSync(path.join(dest, "release"))) {
    const releases = fs.readdirSync(path.join(dest, "release"));
    releases.forEach((release) => {
      if (!release.endsWith(".wasm"))
        fs.unlinkSync(path.join(dest, "release", release));
    });
    fs.rmdirSync(path.join(dest, "__tests__"), {
      recursive: true,
      force: true,
    });
  }

  if (fs.existsSync(path.join(dest, "proto"))) {
    fs.rmdirSync(path.join(dest, "proto/google"), {
      recursive: true,
      force: true,
    });
    fs.rmdirSync(path.join(dest, "proto/koinos"), {
      recursive: true,
      force: true,
    });
  }

  // update index
  const contractFiles = fs.readdirSync(src);
  contractFiles.forEach((contractFile) => {
    if (
      contractFile.endsWith(".ts") &&
      contractFile !== "index.ts" &&
      contractFile !== "constants.ts"
    ) {
      const className = contractFile.replace(".ts", "");
      index += `\nexport { ${className} } from "./${contract.name}/${className}";`;
    }

    if (contractFile === "proto") {
      const protoFiles = fs.readdirSync(path.join(src, "proto"));
      protoFiles.forEach((protoFile) => {
        if (protoFile.endsWith(".ts")) {
          const className = protoFile.replace(".ts", "");
          index += `\nexport { ${className} } from "./${contract.name}/proto/${className}";`;
        }
      });
    }

    if (contractFile === "interfaces") {
      const interfaces = fs.readdirSync(path.join(src, "interfaces"));
      interfaces.forEach((interface) => {
        if (interface.endsWith(".ts")) {
          const className = interface.replace(".ts", "");
          index += `\nexport { ${className.slice(
            1
          )} as ${className} } from "./${
            contract.name
          }/interfaces/${className}";`;
        }
      });
    }
  });

  fs.writeFileSync("./assembly/index.ts", index);
});
