import { spawn } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export async function asyncSpawn(command: string) {
  const [c, ...args] = command.split(" ");
  const child = spawn(c, args, { shell: process.platform === "win32" });

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

export async function precompile(projectName: string, contractName: string) {
  let command = `yarn koinos-precompiler-as contracts/${projectName}`;
  if (projectName !== contractName)
    command += `/koinos-${contractName}.config.js`;
  await asyncSpawn(command);
}

export async function asbuild(projectName: string, contractName: string, buildForTesting: boolean) {
  console.log(`BUILD FOR ${buildForTesting ? "TESTING" : "MAINNET"}`);
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
            outFile: `./build/debug/${contractName}.wasm`,
            textFile: `./build/debug/${contractName}.wat`,
            sourceMap: true,
            debug: true,
          },
          release: {
            outFile: `./build/release/${contractName}.wasm`,
            textFile: `./build/release/${contractName}.wat`,
            sourceMap: true,
            optimizeLevel: 3,
            shrinkLevel: 0,
            converge: false,
            noAssert: false,
            use: [
              `BUILD_FOR_TESTING=${buildForTesting ? "1" : "0"}`
            ]
          },
        },
        options: {
          exportStart: "_start",
          disable: ["sign-extension", "bulk-memory"],
          disableWarning: "235",
          lib: [],
          use: ["abort="],
        },
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

export async function test(projectName: string) {
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
          coverage: {
            lib: ["./node_modules/@as-covers/assembly/index.ts"],
            transform: ["@as-covers/transform", "@as-pect/transform"],
          },
          noCoverage: {
            transform: ["@as-pect/transform"],
          },
        },
        options: {
          exportMemory: true,
          outFile: "output.wasm",
          textFile: "output.wat",
          bindings: "raw",
          exportStart: "_start",
          exportRuntime: true,
          use: ["RTRACE=1"],
          debug: true,
          exportTable: true,
        },
        entries: ["./node_modules/@as-pect/assembly/assembly/index.ts"],
      },
      null,
      2
    )
  );
  try {
    await asyncSpawn(
      `yarn asp --verbose --config contracts/${projectName}/as-pect.config.js --as-config ${tempAsConfigFile}`
    );
    fs.unlinkSync(tempAsConfigFile);
  } catch (error) {
    fs.unlinkSync(tempAsConfigFile);
    throw error;
  }
}

export async function testE2E(projectName: string) {
  await asyncSpawn(`yarn jest ${projectName}-e2e.spec.ts`);
}

export async function docker(pathContract: string) {
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

export function getDeployableContracts(projectName: string) {
  const projectPath = path.join(__dirname, "../contracts", projectName);
  return fs
    .readdirSync(projectPath)
    .filter((f) => f.startsWith("koinos") && f.endsWith(".config.js"))
    .map((f) => {
      if (f === "koinos.config.js") return projectName;
      return f.replace("koinos-", "").replace(".config.js", "");
    });
}
