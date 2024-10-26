import fs from "fs";
import * as fse from "fs-extra";
import path from "path";
import { getInfo } from "./info";
import { getDeployableContracts } from "./compiler";

const CONTRACTS_TO_EXPORT = [
  "freemanasharer",
  "manasharer",
  "nft",
  "nicknames",
  "smartwalletallowance",
  "textparserlib",
  "token",
];

if (!fs.existsSync("./assembly")) {
  fs.mkdirSync("assembly");
}

if (!fs.existsSync("./koinosbox-proto")) {
  fs.mkdirSync("koinosbox-proto");
}

fs.copyFileSync("./contracts/System2.ts", "./assembly/System2.ts");

let index = `export { System2 } from "./System2"`;
const snapshot = [];
const contractsPath = path.join(__dirname, "../contracts");
const contracts = fs.readdirSync(contractsPath, { withFileTypes: true });
const insertedContractFiles: string[] = [];
contracts.forEach((contract) => {
  if (!contract.isDirectory()) return;
  if (!CONTRACTS_TO_EXPORT.includes(contract.name)) return;
  const src = path.join(__dirname, "../contracts", contract.name, "./build");
  const dest = path.join(__dirname, "../assembly", contract.name);
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true /*force: true*/ });
  fse.copySync(src, dest, {
    filter: (s: string) => {
      const base = path.parse(s).base.toLowerCase();
      // remove the files starting with "test", like testcontract
      // in "testcontractmetadata" project. TODO: check if this rule
      // can be removed.
      // The testnet folder is an exception. This one must be exported
      return (
        (!base.startsWith("test") && !base.startsWith("itest")) ||
        base === "testnet"
      );
    },
  });

  if (fs.existsSync(path.join(dest, "__tests__"))) {
    fs.rmSync(path.join(dest, "__tests__"), {
      recursive: true,
      //force: true,
    });
  }

  if (fs.existsSync(path.join(dest, "release"))) {
    const releases = fs.readdirSync(path.join(dest, "release"));
    releases.forEach((release) => {
      if (!release.endsWith(".wasm"))
        fs.unlinkSync(path.join(dest, "release", release));
    });
  }

  if (fs.existsSync(path.join(dest, "testnet"))) {
    const releases = fs.readdirSync(path.join(dest, "testnet"));
    releases.forEach((release) => {
      if (!release.endsWith(".wasm"))
        fs.unlinkSync(path.join(dest, "testnet", release));
    });
  }

  if (fs.existsSync(path.join(dest, "proto"))) {
    fs.rmSync(path.join(dest, "proto/google"), {
      recursive: true,
      //force: true,
    });
    fs.rmSync(path.join(dest, "proto/koinos"), {
      recursive: true,
      //force: true,
    });
    fs.rmSync(path.join(dest, "proto/koinosbox-proto"), {
      recursive: true,
      //force: true,
    });
    fse.copy(
      path.join(dest, "proto"),
      path.join(__dirname, "../koinosbox-proto", contract.name),
      {
        filter: (s: string) => !s.endsWith(".ts"),
      }
    );
  }

  // update index
  const contractFiles = fs.readdirSync(src);
  contractFiles.forEach((contractFile) => {
    if (
      contractFile.endsWith(".ts") &&
      contractFile !== "utils.ts" &&
      contractFile !== "index.ts" &&
      contractFile !== "constants.ts" &&
      !contractFile.toLowerCase().startsWith("test") &&
      !contractFile.toLowerCase().startsWith("itest") &&
      !insertedContractFiles.includes(contractFile)
    ) {
      insertedContractFiles.push(contractFile);
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
        if (
          protoFile.endsWith(".proto") &&
          !protoFile.toLowerCase().startsWith("test") &&
          !protoFile.toLowerCase().startsWith("itest")
        ) {
          const className = protoFile.replace(".proto", "");
          index += `\nexport { ${className} } from "./${contract.name}/proto/${className}";`;
        }
      });
    }

    if (contractFile === "interfaces") {
      const interfaces = fs.readdirSync(path.join(src, "interfaces"));
      interfaces.forEach((interf) => {
        if (interf.endsWith(".ts")) {
          const className = interf.replace(".ts", "");
          index += `\nexport { ${className.slice(
            1
          )} as ${className} } from "./${
            contract.name
          }/interfaces/${className}";`;
        }
      });
    }
  });

  // update snapshot and versions in files
  const deployableContracts = getDeployableContracts(contract.name);
  deployableContracts.forEach((deployable) => {
    const info = getInfo(contract.name, deployable);
    snapshot.push(info);

    // update versions in published files
    const tsFile = fs
      .readdirSync(dest)
      .find((f) => f.replace(".ts", "").toLowerCase() === deployable);
    if (tsFile) {
      const destTsFile = path.join(dest, tsFile);
      let data = fs.readFileSync(destTsFile, "utf8");
      data = data.replace("{{ version }}", `v${info.version}`);
      fs.writeFileSync(destTsFile, data);
    }
  });
});

fs.writeFileSync(path.join(__dirname, "../assembly/index.ts"), index);
fs.writeFileSync(
  path.join(__dirname, "../snapshot.json"),
  JSON.stringify(snapshot, null, 2)
);

// update assembly folder and koinosbox-proto folder in node_modules
fse.copySync(
  path.join(__dirname, "../assembly"),
  path.join(__dirname, "../node_modules/@koinosbox/contracts/assembly")
);

fse.copySync(
  path.join(__dirname, "../koinosbox-proto"),
  path.join(__dirname, "../node_modules/@koinosbox/contracts/koinosbox-proto")
);
