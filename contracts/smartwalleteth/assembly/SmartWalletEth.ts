// SPDX-License-Identifier: MIT
// Smart Wallet Allowance {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  Arrays,
  authority,
  Base58,
  Protobuf,
  Base64,
  StringBytes,
} from "@koinos/sdk-as";
import { System2, common, nft, token, INicknames } from "@koinosbox/contracts";
import { smartwalletallowance } from "./proto/smartwalletallowance";
import { SmartWalletAllowance } from "../../smartwalletallowance/assembly/SmartWalletAllowance";
import { TextParserLib } from "../../../assembly";
import { messageField, resultField } from "@koinosbox/contracts/assembly/textparserlib/TextParserLib";

export class SmartWalletEth extends SmartWalletAllowance {

  nonce: Storage.Obj<common.uint32> = new Storage.Obj(
    this.contractId,
    0,
    common.uint32.decode,
    common.uint32.encode,
    () => new common.uint32(0)
  );

  reentrantLocked: Storage.Obj<common.boole> = new Storage.Obj(
    this.contractId,
    900,
    common.boole.decode,
    common.boole.encode,
    () => new common.boole(false)
  );

  reentrantLock(): void {
    const reentrantLocked = this.reentrantLocked.get()!;
    System.require(reentrantLocked.value == false, "no reentrant");
    this.reentrantLocked.put(new common.boole(true));
  }

  reentrantUnlock(): void {
    this.reentrantLocked.put(new common.boole(false));
  }

  /**
   * Set an allowance in user's contract
   * @external
   */
  set_allowance(args: smartwalletallowance.allowance): void {
    System.require(
      args.type != smartwalletallowance.allowance_type.undefined,
      "allowance type cannot be undefined"
    );
    const isAuthorized = System2.isSignedBy(this.contractId);
    if (!isAuthorized)
      System.fail(
        `not authorized by the wallet ${Base58.encode(this.contractId)}`
      );

    const txId = System.getTransactionField("id")!.bytes_value;
    const allowances = this.allowances.get()!;
    if (!Arrays.equal(txId, allowances.transaction_id)) {
      allowances.transaction_id = txId;
      allowances.allowances = [];
    }
    allowances.allowances.push(args);
    this.allowances.put(allowances);
  }

  executeTransaction(example: string): void {
    this.reentrantLock();
    const tx = `Koinos transaction # 23
allow @pob to burn 1000 KOIN
@koin: transfer 100 KOIN to @adriano
@pob: burn 1000 KOIN
`;
    const commands = tx.split("\n");
    const lib = new TextParserLib();
    let parsed: resultField | null = null;
    parsed = lib.parseMessage(commands[0].trim(), "Koinos transaction # %1_u32")
    if (parsed.error) {
      System.fail(`invalid nonce: ${parsed.error}`);
    }
    const nonce = this.nonce.get()!;
    const newNonce = parsed.field.nested[0].uint32;
    System.log(`nonce: ${newNonce}`);
    if (newNonce != nonce.value + 1) {
      System.fail(`invalid nonce. Expected ${nonce.value + 1}. Received ${newNonce}`);
    }
    
    for (let i = 1; i < commands.length; i += 1) {
      const command = commands[i].trim();
      if (!command) continue;
      const nicknames = new INicknames(new Uint8Array(25)); // TODO: set address
      const posDiv = command.indexOf(" ");
      const commandHeader = command.slice(0, posDiv);
      if (commandHeader.startsWith("@")) {
        const contractName = commandHeader.slice(1).replace(":", "");
        const commandContent = command.slice(posDiv);
        const tabi = nicknames.get_tabi(new nft.token(StringBytes.stringToBytes(contractName)));
        let args: messageField | null = null;
        let entryPoint: u32 = 0;
        for (let j = 0; j < tabi.patterns.length; j += 1) {
          parsed = lib.parseMessage(commandContent, tabi.patterns[j]);
          if (!parsed.error) {
            args = parsed.field;
            entryPoint = tabi.entry_points[]
          }
        }

        if (!args) {
          System.fail(`not possible to parse command ${command}`);
        }

        const argsBuffer = Protobuf.encode(args, messageField.encode);
        const callRes = System.call(tabi.address, entryPoint, argsBuffer);
        if (callRes.code != 0) {
          const errorMessage = `failed to call ${commandHeader} ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
        System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
      } else if (commandHeader === "allow") {
        // allowances

        // "allow @pob to burn 1000 KOIN"
      }
    }


    this.reentrantUnlock();
  }
}
