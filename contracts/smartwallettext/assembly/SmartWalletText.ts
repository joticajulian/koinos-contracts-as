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
  value,
  Crypto,
  chain,
  StringBytes,
} from "@koinos/sdk-as";
import { System2, common, nft, INicknames, token, IToken } from "@koinosbox/contracts";
import { smartwalletallowance } from "./proto/smartwalletallowance";
import { SmartWalletAllowance } from "../../smartwalletallowance/assembly/SmartWalletAllowance";
import { TextParserLib as ITextParserLib } from "../../textparserlib/build/ITextParserLib";
import { textparserlib } from "../../textparserlib/build/proto/textparserlib";

export class SmartWalletText extends SmartWalletAllowance {

  nonce: Storage.Obj<common.uint32> = new Storage.Obj(
    this.contractId,
    1,
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

  checkMessageSignedByEthAddress(
    message: string,
    ethAddress: Uint8Array
  ): boolean {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const ethMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
    let multihashBytes = System.hash(
      Crypto.multicodec.keccak_256,
      StringBytes.stringToBytes(ethMessage)
    );

    for (let i = 0; i < signatures.values.length; i++) {
      if (signatures.values[i].bytes_value.length != 65) continue;
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value,
        multihashBytes!,
        chain.dsa.ecdsa_secp256k1,
        false
      );
      multihashBytes = System.hash(
        Crypto.multicodec.keccak_256,
        publicKey!.subarray(1)
      );
      let mh = new Crypto.Multihash();
      mh.deserialize(multihashBytes!);
      if (Arrays.equal(mh.digest.subarray(-20), ethAddress)) return true;
    }

    return false;
  }

  verifySignature(message: string = ""): boolean {
    const caller = System.getCaller().caller;
    if (caller && caller.length > 0) {
      System.fail("this call must be called from the transaction operations");
    }

    const koin_address_authority = true;
    if (koin_address_authority) {
      // For Koinos signatures the message is the transaction ID
      const isAuthorized = System2.isSignedBy(this.contractId);
      if (isAuthorized) return true;
    }

    if (!message) {
      System.fail("No signature found from the authorities (koin_address)");
    }

    const eth_address_authority = true;
    const eth_address = new Uint8Array(0);
    if (eth_address_authority) {
      const isAuthorized = this.checkMessageSignedByEthAddress(message, eth_address);
      if (isAuthorized) return true;
    }

    System.fail("No signature found from the authorities");
  }

  /**
   * Set an allowance in user's contract
   * @external
   */
  set_allowance(args: smartwalletallowance.allowance): void {
    this.verifySignature();
    this._set_allowance(args);
  }

  /**
   * Execute a text plain transaction
   * @external
   */
  executeTransaction(args: common.str): void {
    this.reentrantLock();
    this.verifySignature(args.value);

    const commands = args.value.split("\n");
    const lib = new ITextParserLib(new Uint8Array(25)); // TODO: set address
    //let parsed: resultField | null = null;
    let parsed: textparserlib.parse_message_result;
    parsed = lib.parse_message(new textparserlib.parse_message_args(
      commands[0].trim(),
      "Koinos transaction # %1_u32"
    ));
    if (parsed.error) {
      System.fail(`invalid nonce: ${parsed.error}`);
    }
    const nonce = this.nonce.get()!;
    const newNonce = Protobuf.decode<common.uint32>(parsed.result, common.uint32.decode).value;
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
        //let commandArgs: messageField | null = null;
        let entryPoint: u32 = 0;
        let argsBuffer: Uint8Array;
        let parsedOk = false;
        for (let j = 0; j < tabi.patterns.length; j += 1) {
          parsed = lib.parse_message(new textparserlib.parse_message_args(
            commandContent,
            tabi.patterns[j]
          ));

          if (!parsed.error) {
            argsBuffer = parsed.result;
            entryPoint = tabi.entry_points[j];
            parsedOk = true;
            break;
          }
        }

        if (!parsedOk) {
          System.fail(`not possible to parse command ${command}`);
        }

        const callRes = System.call(tabi.address, entryPoint, argsBuffer);
        if (callRes.code != 0) {
          const errorMessage = `failed to call ${commandHeader} ${callRes.res.error && callRes.res.error!.message ? callRes.res.error!.message : "unknown error"}`;
          System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
        }
      } else if (commandHeader === "allow") {
        // allowances
        // "allow @pob to burn 1000 KOIN"
        const allowTransfer = lib.parseMessage(commandHeader, "allow %3_address to transfer %2_u64_8 %1_address");
        if (!allowTransfer.error) {
          const tokenAddress = allowTransfer.field.nested[0].bytes;
          const limit = allowTransfer.field.nested[1].uint64;
          const spender = allowTransfer.field.nested[2].bytes;

          const transferData = Protobuf.encode(
            new token.transfer_args(
              this.contractId,
              null, // allow to transfer to anyone
              limit
            ),
            token.transfer_args.encode
          );IToken

          // todo: create an internal this._set_allowance without checking signature?
          this._set_allowance(new smartwalletallowance.allowance(
            smartwalletallowance.allowance_type.transfer_token,
            tokenAddress,
            0x27f576ca, // transfer entry point
            spender,
            transferData
          ));
          continue;
        }
      }
    }

    this.reentrantUnlock();
  }

  /**
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): authority.authorize_result {
    if (args.type != authority.authorization_type.contract_call) {
      // todo: how to upgrade the contract with ETH signature?
      this.verifySignature();
      return new authority.authorize_result(true);
    }
    return this._authorizeWithAllowances(args);
  }
}
