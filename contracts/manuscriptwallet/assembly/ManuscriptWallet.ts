// SPDX-License-Identifier: MIT
// Smart Wallet Allowance {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  authority,
  Protobuf,
  StringBytes,
  Arrays,
} from "@koinos/sdk-as";
import {
  System2,
  common,
  nft,
  INicknames,
  token,
  smartwalletallowance,
  SmartWalletAllowance,
  ITextParserLib,
  textparserlib,
} from "@koinosbox/contracts";
import { manuscriptwallet } from "./proto/manuscriptwallet";
import { KondorElementusNft } from "./IKondorElementusNft";

const nicknamesContractId = BUILD_FOR_TESTING
  ? System2.NICKNAMES_CONTRACT_ID_HARBINGER
  : System2.NICKNAMES_CONTRACT_ID_MAINNET;

const textparserlibContractId = BUILD_FOR_TESTING
  ? System2.TEXTPARSERLIB_CONTRACT_ID_HARBINGER
  : System2.TEXTPARSERLIB_CONTRACT_ID_MAINNET;

export class ManuscriptWallet extends SmartWalletAllowance {
  nonce: Storage.Obj<common.uint32> = new Storage.Obj(
    this.contractId,
    1,
    common.uint32.decode,
    common.uint32.encode,
    () => new common.uint32(0)
  );

  authorities: Storage.Obj<manuscriptwallet.authorities> = new Storage.Obj(
    this.contractId,
    2,
    manuscriptwallet.authorities.decode,
    manuscriptwallet.authorities.encode,
    () => new manuscriptwallet.authorities(true, false)
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

  verifySignature(
    message: string = "",
    logExpectedMessageInError: boolean = false
  ): void {
    const caller = System.getCaller().caller;
    if (caller && caller.length > 0) {
      System.fail("this call must be called from the transaction operations");
    }

    const authorities = this.authorities.get()!;

    if (authorities.koin_address_authority) {
      // For Koinos signatures the message is the transaction ID
      const isAuthorized = System2.isSignedBy(this.contractId);
      if (isAuthorized) return;
    }

    if (!message) {
      System.fail("No signature found from the authorities (koin_address)");
    }

    if (authorities.eth_address_authority) {
      const isAuthorized = System2.checkMessageSignedByEthAddress(
        message,
        authorities.eth_address!
      );
      if (isAuthorized) return;
    }

    let errorMessage = "No signature found from the authorities";
    if (logExpectedMessageInError) {
      errorMessage += `. Message expected for ETH signature: ${message}`;
    }
    System.fail(errorMessage);
  }

  /**
   * @external
   * @readonly
   */
  get_nonce(): common.uint32 {
    return this.nonce.get()!;
  }

  /**
   * @external
   * @readonly
   */
  get_authorities(): manuscriptwallet.authorities {
    return this.authorities.get()!;
  }

  /**
   * @external
   * @event manuscriptwallet.authorities manuscriptwallet.authorities
   */
  set_authorities(args: manuscriptwallet.authorities): void {
    System.require(
      args.koin_address_authority || args.eth_address_authority,
      "set at least 1 authority"
    );
    if (args.eth_address_authority) {
      System.require(
        !!args.eth_address && args.eth_address!.length == 20,
        "invalid eth address"
      );
    }
    const nonce = this.nonce.get()!;
    nonce.value += 1;
    const message = [
      `Koinos ${BUILD_FOR_TESTING ? "testnet " : ""}transaction # ${
        nonce.value
      }`,
      "update authorities of the smart wallet to:",
      `koin_address_authority: ${args.koin_address_authority}`,
      `eth_address_authority: ${args.eth_address_authority}`,
      `eth_address: ${
        args.eth_address ? System2.hexString(args.eth_address!) : "0x"
      }`,
    ].join("\n");
    this.verifySignature(message, true);
    this.authorities.put(args);
    this.nonce.put(nonce);
    System.event("manuscriptwallet.authorities", this.callArgs!.args, []);
  }

  /**
   * Set an allowance in user's contract
   * @external
   */
  set_allowance(args: smartwalletallowance.allowance): void {
    // todo: set message for ETH
    this.verifySignature();
    this._set_allowance(args);
  }

  /**
   * Execute a text plain transaction
   * @external
   */
  execute_transaction(args: manuscriptwallet.execute_transaction_args): void {
    this.reentrantLock();
    const canUseFeature = new KondorElementusNft().can_use_smart_wallet_feature(
      new common.address(this.contractId)
    );
    System.require(
      canUseFeature.value,
      "you need to hold a Kondor Elementus NFT to use the manuscript wallet"
    );
    this.verifySignature(args.transaction!);

    const commands = args.transaction!.split("\n");
    const lib = new ITextParserLib(textparserlibContractId);
    let parsed: textparserlib.parse_message_result;
    const nonce = this.nonce.get()!;
    nonce.value += 1;
    const expectedHeader = `Koinos ${
      BUILD_FOR_TESTING ? "testnet " : ""
    }transaction #${nonce.value}`;
    if (commands[0].trim() != expectedHeader) {
      System.fail(`invalid header. Expected: ${expectedHeader}`);
    }
    this.nonce.put(nonce);

    const nicknames = new INicknames(nicknamesContractId);
    for (let i = 1; i < commands.length; i += 1) {
      const command = commands[i].trim();
      if (!command) continue;
      if (args.debug) System.log(`processing: ${command}`);
      const posDiv = command.indexOf(" ");
      const commandHeader = command.slice(0, posDiv);
      if (commandHeader.startsWith("@")) {
        const contractName = commandHeader.slice(1).replace(":", "");
        const commandContent = command.slice(posDiv + 1);
        const nicknameId = StringBytes.stringToBytes(contractName);
        const tabi = nicknames.get_tabi(new nft.token(nicknameId));

        // if a contract address has multiple nicknames, require
        // to use the main one to prevent security issues
        const mainToken = nicknames.get_main_token(
          new common.address(tabi.address)
        );
        if (!Arrays.equal(nicknameId, mainToken.token_id)) {
          System.fail(
            `use @${StringBytes.bytesToString(
              mainToken.token_id
            )} instead of @${nicknameId}`
          );
        }

        let entryPoint: u32 = 0;
        let argsBuffer = new Uint8Array(0);
        let parsedOk = false;
        for (let j = 0; j < tabi.items.length; j += 1) {
          if (args.debug)
            System.log(
              `trying to parse with pattern: ${
                tabi.items[j].pattern
                  ? tabi.items[j].pattern!
                  : "invalid pattern"
              }`
            );
          parsed = lib.parse_message(
            new textparserlib.parse_message_args(
              commandContent,
              tabi.items[j].pattern
            )
          );

          if (!parsed.error) {
            if (args.debug) System.log("parse ok");
            argsBuffer = parsed.result ? parsed.result! : new Uint8Array(0);
            entryPoint = tabi.items[j].entry_point;
            parsedOk = true;
            break;
          }

          if (args.debug) System.log(`parse error: ${parsed.error!}`);
        }

        if (!parsedOk) {
          System.fail(`not possible to parse command ${command}`);
        }

        const callRes = System.call(tabi.address!, entryPoint, argsBuffer);
        if (callRes.code != 0) {
          const errorMessage = `failed to call ${commandHeader} ${
            callRes.res.error && callRes.res.error!.message
              ? callRes.res.error!.message
              : "unknown error"
          }`;
          System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
        }
      } else if (commandHeader === "allow") {
        // allowances
        if (args.debug)
          System.log(
            "trying to parse allowance with pattern: allow %3_address to transfer %2_u64_8 %1_address"
          );
        const allowTransfer = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to transfer %2_u64_8 %1_address"
          )
        );
        if (!allowTransfer.error) {
          if (args.debug) System.log("parse ok");
          const allow = Protobuf.decode<manuscriptwallet.allow_token_operation>(
            allowTransfer.result!,
            manuscriptwallet.allow_token_operation.decode
          );
          const transferData = Protobuf.encode(
            new token.transfer_args(
              this.contractId,
              null, // allow to transfer to anyone
              allow.limit
            ),
            token.transfer_args.encode
          );

          this._set_allowance(
            new smartwalletallowance.allowance(
              smartwalletallowance.allowance_type.transfer_token,
              allow.token,
              0x27f576ca, // transfer entry point
              allow.spender,
              transferData
            )
          );
          continue;
        }

        if (args.debug)
          System.log(
            "trying to parse allowance with pattern: allow %3_address to transfer %2_bytes_hex of %1_address NFT collection"
          );
        const allowTransferNft = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to transfer %2_bytes_hex of %1_address NFT collection"
          )
        );
        if (!allowTransferNft.error) {
          if (args.debug) System.log("parse ok");
          const allow = Protobuf.decode<manuscriptwallet.allow_nft_operation>(
            allowTransferNft.result!,
            manuscriptwallet.allow_nft_operation.decode
          );
          const transferData = Protobuf.encode(
            new nft.transfer_args(
              this.contractId,
              null, // allow to transfer to anyone
              allow.token_id
            ),
            nft.transfer_args.encode
          );

          this._set_allowance(
            new smartwalletallowance.allowance(
              smartwalletallowance.allowance_type.transfer_nft,
              allow.collection,
              0x27f576ca, // transfer entry point,
              allow.spender,
              transferData
            )
          );
          continue;
        }

        if (args.debug)
          System.log(
            "trying to parse allowance with pattern: allow %3_address to burn %2_u64_8 %1_address"
          );
        const allowBurnToken = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to burn %2_u64_8 %1_address"
          )
        );
        if (!allowBurnToken.error) {
          if (args.debug) System.log("parse ok");
          const allow = Protobuf.decode<manuscriptwallet.allow_token_operation>(
            allowBurnToken.result!,
            manuscriptwallet.allow_token_operation.decode
          );
          const burnData = Protobuf.encode(
            new token.burn_args(this.contractId, allow.limit),
            token.burn_args.encode
          );

          this._set_allowance(
            new smartwalletallowance.allowance(
              smartwalletallowance.allowance_type.burn_token,
              allow.token,
              0x859facc5, // burn entry point
              allow.spender,
              burnData
            )
          );
          continue;
        }

        if (args.debug)
          System.log(
            "trying to parse allowance with pattern: allow %3_address to call the entry point %2_u32 of contract %1_address with data %4_bytes_base64"
          );
        const otherAllowance = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to call the entry point %2_u32 of contract %1_address with data %4_bytes_base64"
          )
        );
        if (!otherAllowance.error) {
          if (args.debug) System.log("parse ok");
          const allow = Protobuf.decode<manuscriptwallet.allow_other>(
            otherAllowance.result!,
            manuscriptwallet.allow_other.decode
          );
          this._set_allowance(
            new smartwalletallowance.allowance(
              smartwalletallowance.allowance_type.other,
              allow.contract_id,
              allow.entry_point,
              allow.caller,
              allow.data
            )
          );
          continue;
        }

        System.fail(`allowance command not supported`);
      }
    }

    this.reentrantUnlock();
  }

  /**
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): authority.authorize_result {
    System.log("authorize manuscriptwallet called");
    if (args.type != authority.authorization_type.contract_call) {
      const authorities = this.authorities.get()!;
      let message = "";
      if (authorities.eth_address_authority) {
        const txId = System.getTransactionField("id")!.bytes_value;
        if (args.type == authority.authorization_type.contract_upload) {
          message = `update smart wallet contract of koinos ${
            BUILD_FOR_TESTING ? "testnet " : ""
          }with code in transaction id ${System2.hexString(txId)}`;
        } else if (
          args.type == authority.authorization_type.transaction_application
        ) {
          message = `pay mana (or allow nonce update) of koinos ${
            BUILD_FOR_TESTING ? "testnet " : ""
          } transaction id ${System2.hexString(txId)}`;
        }
      }
      if (message)
        System.log(`message expected for the ETH signature: ${message}`);
      this.verifySignature(message, true);
      return new authority.authorize_result(true);
    }
    return this._authorizeWithAllowances(args);
  }
}
