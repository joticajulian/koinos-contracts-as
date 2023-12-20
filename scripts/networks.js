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
      proposer: keysHarbinger(process.env.HARBINGER_PROPOSER),
      freeMana: keysHarbinger(process.env.HARBINGER_FREE_MANA),
      manaSharer: keysHarbinger(process.env.HARBINGER_MANA_SHARER),
      token: keysHarbinger(process.env.HARBINGER_TOKEN),
      nicknames: keysHarbinger(process.env.HARBINGER_NICKNAMES),
      getContractMetadata: keysHarbinger(
        process.env.HARBINGER_GET_CONTRACT_METADATA
      ),
      "testgetcontractmetadata/testcontract": keysHarbinger(
        process.env.HARBINGER_GET_CONTRACT_METADATA_TEST_CONTRACT
      ),
      "testgetcontractmetadata/testthirdparty": keysHarbinger(
        process.env.HARBINGER_GET_CONTRACT_METADATA_TEST_THIRD_PARTY
      ),
      "testgetcontractmetadata/testwallet": keysHarbinger(
        process.env.HARBINGER_GET_CONTRACT_METADATA_TEST_WALLET
      ),
    },
  },
  mainnet: {
    rpcNodes: ["https://api.koinos.io", "https://api.koinosblocks.com"],
    accounts: {
      proposer: keysMainnet(process.env.MAINNET_PROPOSER),
      freeMana: {
        id: process.env.MAINNET_FREE_MANA_ID,
      },
      nicknames: keysMainnet(process.env.MAINNET_NICKNAMES),
      getContractMetadata: keysMainnet(
        process.env.MAINNET_GET_CONTRACT_METADATA
      ),
    },
  },
};
