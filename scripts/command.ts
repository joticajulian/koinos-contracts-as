import fs from "fs";
import path from "path";
import { asbuild, getDeployableContracts, precompile } from "./compiler";

const buildAllSkip = ["smartwallettext"];

const [command] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "clear-builds": {
      const contractsPath = path.join(__dirname, "../contracts");
      const contracts = fs
        .readdirSync(contractsPath, { withFileTypes: true })
        .filter((c) => c.isDirectory());
      contracts.forEach((contract) => {
        const buildDir = path.join(contractsPath, contract.name, "build");
        if (fs.existsSync(buildDir)) {
          fs.rmSync(buildDir, { recursive: true });
        }
      });
      break;
    }
    case "build-all": {
      const contractsPath = path.join(__dirname, "../contracts");
      const contracts = fs
        .readdirSync(contractsPath, { withFileTypes: true })
        .filter((c) => c.isDirectory());
      for (let i = 0; i < contracts.length; i += 1) {
        const projectName = contracts[i].name;
        if (buildAllSkip.includes(projectName)) continue;
        const deployableContracts = getDeployableContracts(projectName);
        for (let j = 0; j < deployableContracts.length; j += 1) {
          const contractName = deployableContracts[j];
          await precompile(projectName, contractName);
          await asbuild(projectName, contractName);
        }
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
