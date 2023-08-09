const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");

if (!fs.existsSync("./dist")) {
  fs.mkdirSync("dist");
}

const contracts = fs.readdirSync("./contracts", { withFileTypes: true });
contracts.forEach((contract) => {
  if (!contract.isDirectory()) return;
  if (contract.name !== "token") return;
  const src = path.join("./contracts", contract.name, "./build");
  const dest = path.join("./dist", contract.name);
  fs.rmdirSync(dest, { recursive: true, force: true });
  fse.copySync(src, dest);
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
});
