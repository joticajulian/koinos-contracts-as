import fs from "fs";
import path from "path";
import { showInfo } from "./showInfo";
import { deployContract } from "./deployContract";
import { precompile, asbuild, test, testE2E, docker } from "./compiler";

const [pathContract, command, ...args] = process.argv.slice(2);

async function main() {
  let [projectName, contractName] = pathContract.split("/");
  if (!contractName) contractName = projectName;
  switch (command) {
    case "precompile": {
      await precompile(projectName, contractName);
      break;
    }
    case "asbuild": {
      await asbuild(projectName, contractName);
      break;
    }
    case "build": {
      await precompile(projectName, contractName);
      await asbuild(projectName, contractName);
      break;
    }
    case "build-all": {
      const projectPath = path.join(__dirname, "../contracts", projectName);
      const contractsWithConfigFile = fs
        .readdirSync(projectPath)
        .filter((f) => f.startsWith("koinos") && f.endsWith(".config.js"))
        .map((f) => {
          if (f === "koinos.config.js") return projectName;
          return f.replace("koinos-", "").replace(".config.js", "");
        });
      const files = fs
        .readdirSync(path.join(projectPath, "assembly"))
        .filter(
          (f) =>
            f.endsWith(".ts") &&
            contractsWithConfigFile.includes(f.toLocaleLowerCase().slice(0, -3))
        )
        .map((f) => f.toLowerCase().slice(0, -3));
      for (let i = 0; i < files.length; i += 1) {
        await precompile(projectName, files[i]);
        await asbuild(projectName, files[i]);
      }
      break;
    }
    case "test": {
      await test(projectName);
      break;
    }
    case "test-e2e": {
      await testE2E(projectName);
      break;
    }
    case "deploy": {
      const [networkName] = args;
      await deployContract(pathContract, networkName);
      break;
    }
    case "info": {
      showInfo(projectName, contractName);
      break;
    }
    case "docker": {
      await docker(pathContract);
      break;
    }
    default: {
      throw new Error(
        `Invalid command ${command}. Accepted commands: ${[
          "precompile",
          "asbuild",
          "build",
          "build-all",
          "test",
          "test-e2e",
          "deploy",
          "info",
          "docker",
        ].join(", ")}`
      );
    }
  }
}

main()
  .then(() => {})
  .catch(console.log);
