const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

if (!fs.existsSync("./assembly")) {
  fs.mkdirSync("assembly");
}

if (!fs.existsSync("./koinosbox-proto")) {
  fs.mkdirSync("koinosbox-proto");
}

fs.copyFileSync("./contracts/System2.ts", "./assembly/System2.ts");

let index = `export { System2 } from "./System2"`;
const contracts = fs.readdirSync("./contracts", { withFileTypes: true });
contracts.forEach((contract) => {
  if (!contract.isDirectory()) return;
  const src = path.join("./contracts", contract.name, "./build");
  const dest = path.join("./assembly", contract.name);
  if (fs.existsSync(dest)) fs.rmdirSync(dest, { recursive: true, force: true });
  fse.copySync(src, dest, {
    filter: (s) => {
      const base = path.parse(s).base.toLowerCase();
      return !base.startsWith("test") && !base.startsWith("itest");
    },
  });

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
    fs.rmdirSync(path.join(dest, "proto/koinosbox-proto"), {
      recursive: true,
      force: true,
    });
    fse.copy(
      path.join(dest, "proto"),
      path.join("./koinosbox-proto", contract.name),
      {
        filter: (s) => !s.endsWith(".ts"),
      }
    );
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

      if (contractFile.startsWith("I")) {
        // Interfaces
        index += `\nexport { ${className.slice(1)} as ${className} } from "./${
          contract.name
        }/${className}";`;
      } else {
        // Contracts
        index += `\nexport { ${className} } from "./${contract.name}/${className}";`;
      }
    }

    if (contractFile === "proto") {
      const protoFiles = fs.readdirSync(path.join(src, "proto"));
      protoFiles.forEach((protoFile) => {
        if (protoFile.endsWith(".proto")) {
          const className = protoFile.replace(".proto", "");
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
