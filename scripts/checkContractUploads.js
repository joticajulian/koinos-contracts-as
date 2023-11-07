const crypto = require("crypto");
const { Provider, utils } = require("koilib");
const networks = require("./networks.js");

const [contractId, inputeNetworkName] = process.argv.slice(2);
const networkName = inputeNetworkName || "mainnet";
const regsPerCall = 100;

(async () => {
  const provider = new Provider(networks[networkName].rpcNodes);
  let found = false;
  let seqNum = 0;
  let contractUploads = 0;
  while (!found) {
    const result = await provider.call("account_history.get_account_history", {
      address: contractId,
      ascending: true,
      limit: regsPerCall,
      seq_num: seqNum,
    });

    for (let i = 0; i < result.values.length; i += 1) {
      const historyEntry = result.values[i];
      if (!historyEntry.trx) continue;
      const { trx: trxRecord } = historyEntry;
      if (!trxRecord.transaction || !trxRecord.transaction.operations) continue;
      for (let j = 0; j < trxRecord.transaction.operations.length; j += 1) {
        const op = trxRecord.transaction.operations[j];
        if (!op.upload_contract) continue;
        const {
          authorizes_call_contract,
          authorizes_transaction_application,
          authorizes_upload_contract,
        } = op.upload_contract;
        const bytecode = utils.decodeBase64url(op.upload_contract.bytecode);
        const hash = crypto.createHash("sha256").update(bytecode).digest("hex");

        console.log({
          seq_num: historyEntry.seq_num || 0,
          trxId: trxRecord.transaction.id,
          opType: "upload_contract",
          size: bytecode.length,
          hash,
          authorizes_call_contract,
          authorizes_transaction_application,
          authorizes_upload_contract,
        });
        contractUploads += 1;
      }
    }
    const lastSeqNum = Number(result.values[result.values.length - 1].seq_num);
    seqNum += regsPerCall;
    console.log({
      lastSeqNum,
      seqNum,
    });
    if (lastSeqNum < seqNum - 1) {
      console.log(`search ended in seq_num ${lastSeqNum}`);
      break;
    }
  }
  console.log(`number of contract uploads: ${contractUploads}`);
})();
