import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { showInfo } from "./showInfo";
import { deployContract } from "./deployContract";

const [pathContract, command, ...args] = process.argv.slice(2);

async function asyncSpawn(command: string) {
  const [c, ...args] = command.split(" ");
  const child = spawn(c, args);

  if (child.stdout) {
    child.stdout.on("data", (data: Buffer) => {
      process.stdout.write(data.toString());
    });
  }

  if (child.stderr) {
    child.stderr.on("data", (data: Buffer) => {
      process.stdout.write(data.toString());
    });
  }

  return new Promise((resolve, reject) => {
    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(0);
      } else {
        const err = new Error(`child exited with code ${code}`);
        reject(err);
      }
    });
  });
}

async function precompile(projectName: string, contractName: string) {
  let command = `yarn koinos-precompiler-as contracts/${projectName}`;
  if (projectName !== contractName)
    command += `/koinos-${contractName}.config.js`;
  await asyncSpawn(command);
}

async function asbuild(projectName: string, contractName: string) {
  const projectPath = path.join(__dirname, "../contracts", projectName);
  const tempAsConfigFile = path.join(
    projectPath,
    `asconfig-temp-${crypto.randomBytes(5).toString("hex")}.json`
  );
  fs.writeFileSync(
    tempAsConfigFile,
    JSON.stringify(
      {
        targets: {
          debug: {
            binaryFile: `./build/debug/${contractName}.wasm`,
            textFile: `./build/debug/${contractName}.wat`,
            sourceMap: true,
            debug: true,
          },
          release: {
            binaryFile: `./build/release/${contractName}.wasm`,
            textFile: `./build/release/${contractName}.wat`,
            sourceMap: true,
            optimizeLevel: 3,
            shrinkLevel: 0,
            converge: false,
            noAssert: false,
          },
        },
        options: {},
      },
      null,
      2
    )
  );
  const indexFile = path.join(projectPath, "build/index.ts");
  try {
    await asyncSpawn(
      `yarn asc ${indexFile} --config ${tempAsConfigFile} --use abort= --target release`
    );
    fs.unlinkSync(tempAsConfigFile);
  } catch (error) {
    fs.unlinkSync(tempAsConfigFile);
    throw error;
  }
}

async function test(projectName: string) {
  await asyncSpawn(
    `yarn asp --verbose --config contracts/${projectName}/as-pect.config.js`
  );
}

async function testE2E(projectName: string) {
  await asyncSpawn(`yarn jest ${projectName}-e2e.spec.ts`);
}

async function docker(pathContract: string) {
  const dockerFile = path.join(__dirname, "../Dockerfile");
  fs.writeFileSync(
    dockerFile,
    `FROM node:16.14.2
WORKDIR /contracts
ADD . ./
RUN yarn install --frozen-lockfile --silent && yarn cache clean
RUN yarn dev ${pathContract} build
RUN yarn dev ${pathContract} info`
  );

  try {
    await asyncSpawn(
      `docker build --no-cache --progress=plain -t temp-image . && docker rmi temp-image`
    );
    fs.unlinkSync(dockerFile);
  } catch (error) {
    fs.unlinkSync(dockerFile);
    throw error;
  }
}

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
