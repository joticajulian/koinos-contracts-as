// SPDX-License-Identifier: MIT
// EthAddress Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Crypto,
  Storage,
  StringBytes,
  Arrays,
  Protobuf,
  authority,
  value,
  chain,
} from "@koinos/sdk-as";
import { Nft, System2, nft, common } from "@koinosbox/contracts";
import { ethaddress } from "./proto/ethaddress";

export class Ethaddress extends Nft {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "Eth addresses";
  _symbol: string = "ETHADDRESS";
  _uri: string = "";

  checkMessageSignedByEthAddress(message: string, ethAddress: Uint8Array): boolean {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const ethMessage = `\x19Ethereum Signed Message:\n${message.length}${message}`;
    let multihashBytes = System.hash(Crypto.multicodec.keccak_256, StringBytes.stringToBytes(ethMessage));

    for (let i = 0; i < signatures.values.length; i++) {
      const publicKey = System.recoverPublicKey(signatures.values[i].bytes_value, multihashBytes!, chain.dsa.ecdsa_secp256k1, false);
      multihashBytes = System.hash(Crypto.multicodec.keccak_256, publicKey!.subarray(1));
      let mh = new Crypto.Multihash();
      mh.deserialize(multihashBytes!);
      if (Arrays.equal(mh.digest.subarray(-20), ethAddress)) return true;
    }

    return false;
  }

  /**
   * @external
   */
  mint(args: nft.mint_args): void {
    const message = "";
    const authorized = this.checkMessageSignedByEthAddress("TODO", args.token_id);
    if (!authorized) {
      System.fail("not signed by the ethereum address")
    }
  }
}
