import crypto from "crypto";
import fs from "fs";
import path from "path";

function humanFileSize(size: number) {
  const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
}

export function getInfo(projectName: string, contractName: string) {
  const filePathRelease = path.join(
    __dirname,
    "../contracts",
    projectName,
    `build/release/${contractName}.wasm`
  );
  const dataRelease = fs.readFileSync(filePathRelease);
  const hashRelease = crypto
    .createHash("sha256")
    .update(dataRelease)
    .digest("hex");

  const filePathTestnet = path.join(
    __dirname,
    "../contracts",
    projectName,
    `build/testnet/${contractName}.wasm`
  );
  const dataTestnet = fs.readFileSync(filePathTestnet);
  const hashTestnet = crypto
    .createHash("sha256")
    .update(dataTestnet)
    .digest("hex");

  const pathConfigFile = path.join(
    __dirname,
    "../contracts",
    projectName,
    projectName === contractName
      ? "koinos.config.js"
      : `koinos-${contractName}.config.js`
  );
  const configFile = require(pathConfigFile);
  return {
    contract:
      projectName === contractName
        ? contractName
        : `${projectName}/${contractName}`,
    version: configFile.version,
    mainnet: {
      size: dataRelease.length,
      sizeHuman: humanFileSize(dataRelease.length),
      sha256: hashRelease,
    },
    harbinger: {
      size: dataTestnet.length,
      sizeHuman: humanFileSize(dataTestnet.length),
      sha256: hashTestnet,
    },
  };
}

export function showInfo(projectName: string, contractName: string) {
  const filePath = path.join(
    __dirname,
    "../contracts",
    projectName,
    `build/release/${contractName}.wasm`
  );
  const data = fs.readFileSync(filePath);
  const hash = crypto.createHash("sha256").update(data).digest("hex");

  console.log(`
contract: ${projectName}/${contractName}
file:     ${filePath}
size:     ${data.length} bytes (${humanFileSize(data.length)})
sha256:   ${hash}
`);
}
