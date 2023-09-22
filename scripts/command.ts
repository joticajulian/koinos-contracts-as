import fs from "fs";
import path from "path";

const [command] = process.argv.slice(2);

async function main() {
  switch (command) {
    case "clear-builds": {
      const contractsPath = path.join(__dirname, "../contracts");
      const contracts = fs.readdirSync(contractsPath, { withFileTypes: true });
      contracts.forEach((contract) => {
        if (!contract.isDirectory()) return;
        fs.rmdirSync(path.join(contractsPath, contract.name, "build"), {
          recursive: true,
        });
      });
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
