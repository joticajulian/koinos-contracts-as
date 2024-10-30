// SPDX-License-Identifier: MIT
// Smart Wallet Allowance {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  authority,
  Protobuf,
  StringBytes,
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
import { smartwallettext } from "./proto/smartwallettext";

const nicknamesContractId = BUILD_FOR_TESTING
  ? System2.NICKNAMES_CONTRACT_ID_HARBINGER
  : System2.NICKNAMES_CONTRACT_ID_MAINNET;

const textparserlibContractId = BUILD_FOR_TESTING
  ? System2.TEXTPARSERLIB_CONTRACT_ID_HARBINGER
  : System2.TEXTPARSERLIB_CONTRACT_ID_MAINNET;

export class SmartWalletText extends SmartWalletAllowance {
  nonce: Storage.Obj<common.uint32> = new Storage.Obj(
    this.contractId,
    1,
    common.uint32.decode,
    common.uint32.encode,
    () => new common.uint32(0)
  );

  authorities: Storage.Obj<smartwallettext.authorities> = new Storage.Obj(
    this.contractId,
    2,
    smartwallettext.authorities.decode,
    smartwallettext.authorities.encode,
    () => new smartwallettext.authorities(true, false)
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

  verifySignature(message: string = ""): void {
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

    System.fail("No signature found from the authorities");
  }

  /**
   * @external
   * @event smartwallettext.authorities smartwallettext.authorities
   */
  set_authorities(args: smartwallettext.authorities): void {
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
    if (message)
      System.log(`message expected for the ETH signature: ${message}`);
    this.verifySignature();
    this.authorities.put(args);
    this.nonce.put(nonce);
    System.event("smartwallettext.authorities", this.callArgs!.args, []);
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
  execute_transaction(args: common.str): void {
    this.reentrantLock();
    this.verifySignature(args.value!);

    const commands = args.value!.split("\n");
    const lib = new ITextParserLib(textparserlibContractId);
    let parsed: textparserlib.parse_message_result;
    const nonce = this.nonce.get()!;
    nonce.value += 1;
    const expectedHeader = `Koinos ${
      BUILD_FOR_TESTING ? "testnet " : ""
    }transaction # ${nonce.value}`;
    if (commands[0].trim() != expectedHeader) {
      System.fail(`invalid header. Expected: ${expectedHeader}`);
    }
    this.nonce.put(nonce);

    for (let i = 1; i < commands.length; i += 1) {
      const command = commands[i].trim();
      if (!command) continue;
      const nicknames = new INicknames(nicknamesContractId);
      const posDiv = command.indexOf(" ");
      const commandHeader = command.slice(0, posDiv);
      if (commandHeader.startsWith("@")) {
        const contractName = commandHeader.slice(1).replace(":", "");
        const commandContent = command.slice(posDiv + 1);
        const tabi = nicknames.get_tabi(
          new nft.token(StringBytes.stringToBytes(contractName))
        );
        //let commandArgs: messageField | null = null;
        let entryPoint: u32 = 0;
        let argsBuffer = new Uint8Array(0);
        let parsedOk = false;
        for (let j = 0; j < tabi.items.length; j += 1) {
          parsed = lib.parse_message(
            new textparserlib.parse_message_args(
              commandContent,
              tabi.items[j].pattern
            )
          );

          if (!parsed.error) {
            argsBuffer = parsed.result ? parsed.result! : new Uint8Array(0);
            entryPoint = tabi.items[j].entry_point;
            parsedOk = true;
            break;
          }
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
        const allowTransfer = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to transfer %2_u64_8 %1_address"
          )
        );
        if (!allowTransfer.error) {
          const allow = Protobuf.decode<smartwallettext.allow_token_operation>(
            allowTransfer.result!,
            smartwallettext.allow_token_operation.decode
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

        const allowTransferNft = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to transfer %2_bytes_hex of %1_address NFT collection"
          )
        );
        if (!allowTransferNft.error) {
          const allow = Protobuf.decode<smartwallettext.allow_nft_operation>(
            allowTransferNft.result!,
            smartwallettext.allow_nft_operation.decode
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

        const allowBurnToken = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to burn %2_u64_8 %1_address"
          )
        );
        if (!allowBurnToken.error) {
          const allow = Protobuf.decode<smartwallettext.allow_token_operation>(
            allowBurnToken.result!,
            smartwallettext.allow_token_operation.decode
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

        const otherAllowance = lib.parse_message(
          new textparserlib.parse_message_args(
            command,
            "allow %3_address to call the entry point %2_u32 of contract %1_address with data %4_bytes_base64"
          )
        );
        if (!otherAllowance.error) {
          const allow = Protobuf.decode<smartwallettext.allow_other>(
            otherAllowance.result!,
            smartwallettext.allow_other.decode
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
    System.log("authorize smartwallettext called");
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
      this.verifySignature(message);
      return new authority.authorize_result(true);
    }
    return this._authorizeWithAllowances(args);
  }
}
