import fs from "fs";
import path from "path";
import { asbuild, precompile } from "./compiler";

const [command] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "clear-builds": {
      const contractsPath = path.join(__dirname, "../contracts");
      const contracts = fs
        .readdirSync(contractsPath, { withFileTypes: true })
        .filter((c) => c.isDirectory());
      contracts.forEach((contract) => {
        fs.rmdirSync(path.join(contractsPath, contract.name, "build"), {
          recursive: true,
        });
      });
      break;
    }
    case "build-all": {
      const contractsPath = path.join(__dirname, "../contracts");
      const contracts = fs
        .readdirSync(contractsPath, { withFileTypes: true })
        .filter((c) => c.isDirectory());
      for (let i = 0; i < contracts.length; i += 1) {
        const contractName = contracts[0].name;
        await precompile(contractName, contractName);
        await asbuild(contractName, contractName);
      }
      break;
    }
    default: {
      throw new Error(
        `Invalid command ${command}. Accepted commands: ${["clear-builds"].join(
          ", "
        )}`
      );
    }
  }
}

main()
  .then(() => {})
  .catch(console.log);
