const path = require("path");
const HDKoinos = require("../HDKoinos");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

function keys(mnemonic, accIndex) {
  const hdKoinos = new HDKoinos(mnemonic);
  const acc = hdKoinos.deriveKeyAccount(accIndex);
  return {
    privateKey: acc.private.privateKey,
    id: acc.public.address,
  };
}

function keysHarbinger(accIndex) {
  const mnemonic = process.env.HARBINGER_MNEMONIC;
  if (!mnemonic) return { privateKey: "", id: "" };
  return keys(mnemonic, Number(accIndex));
}

function keysMainnet(accIndex) {
  const mnemonic = process.env.MAINNET_MNEMONIC;
  if (!mnemonic) return { privateKey: "", id: "" };
  return keys(mnemonic, Number(accIndex));
}

module.exports = {
  harbinger: {
    rpcNodes: [
      "https://harbinger-api.koinos.io",
      "https://testnet.koinosblocks.com",
    ],
    accounts: {
      freeMana: keysHarbinger(process.env.HARBINGER_FREE_MANA),
      manaSharer: keysHarbinger(process.env.HARBINGER_MANA_SHARER),
      token: keysHarbinger(process.env.HARBINGER_TOKEN),
    },
  },
  mainnet: {
    rpcNodes: ["https://api.koinos.io", "https://api.koinosblocks.com"],
    accounts: {
      manaSharer: {
        privateKey: process.env.MAINNET_MANA_SHARER_PRIVATE_KEY,
        id: process.env.MAINNET_MANA_SHARER_ID,
      },
      contract: {
        privateKey: process.env.MAINNET_TOKEN_CONTRACT_PRIVATE_KEY,
        id: process.env.MAINNET_TOKEN_CONTRACT_ID,
      },
    },
  },
};
