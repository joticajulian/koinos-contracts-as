// SPDX-License-Identifier: MIT
// EthAddress Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Crypto,
  StringBytes,
  Arrays,
  Protobuf,
  value,
  chain,
  Base58,
} from "@koinos/sdk-as";
import { Nft, nft } from "@koinosbox/contracts";

function hexString(buffer: Uint8Array): string {
  let hex = "0x";
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] < 0x10) hex += "0";
    hex += buffer[i].toString(16);
  }
  return hex;
}

export class Ethaddress extends Nft {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "Eth addresses";
  _symbol: string = "ETHADDRESS";
  _uri: string = "";

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

  /**
   * Register an ethereum address on koinos blockchain
   * @external
   */
  mint(args: nft.mint_args): void {
    const message = `link eth address ${hexString(
      args.token_id!
    )} with koinos address ${Base58.encode(args.to!)}`;
    const authorized = this.checkMessageSignedByEthAddress(
      message,
      args.token_id!
    );
    if (!authorized) {
      System.fail("not signed by the ethereum address");
    }
    this._mint(args);
  }

  /**
   * Link an ethereum address to a different koinos address
   * @external
   */
  transfer(args: nft.transfer_args): void {
    const message = `change link of eth address ${hexString(
      args.token_id!
    )} to koinos address ${Base58.encode(args.to!)}`;
    const authorized = this.checkMessageSignedByEthAddress(
      message,
      args.token_id!
    );
    if (!authorized) {
      System.fail("not signed by the ethereum address");
    }
    this._transfer(args);
  }

  /**
   * Deprecated - set metadata
   * @external
   */
  set_metadata(args: nft.metadata_args): void {
    System.fail("set_metadata is deprecated");
  }

  /**
   * Deprecated - approve
   * @external
   */
  approve(args: nft.approve_args): void {
    System.fail("approve is deprecated");
  }

  /**
   * Deprecated - set_approval_for_all
   * @external
   */
  set_approval_for_all(args: nft.set_approval_for_all_args): void {
    System.fail("set_approval_for_all is deprecated");
  }
}
