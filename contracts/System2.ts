import {
  System,
  Crypto,
  Protobuf,
  value,
  Arrays,
  StringBytes,
  chain,
} from "@koinos/sdk-as";

export namespace System2 {
  export function getSigners(): Array<Uint8Array> {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const txId = System.getTransactionField("id")!.bytes_value;

    const signers: Array<Uint8Array> = [];
    for (let i = 0; i < signatures.values.length; i++) {
      if (signatures.values[i].bytes_value.length != 65) continue;
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value,
        txId
      );
      const address = Crypto.addressFromPublicKey(publicKey!);
      signers.push(address);
    }
    return signers;
  }

  export function isSignedBy(address: Uint8Array): boolean {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const txId = System.getTransactionField("id")!.bytes_value;

    for (let i = 0; i < signatures.values.length; i++) {
      if (signatures.values[i].bytes_value.length != 65) continue;
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value,
        txId
      );
      const signer = Crypto.addressFromPublicKey(publicKey!);
      if (Arrays.equal(signer, address)) return true;
    }
    return false;
  }

  export function checkMessageSignedByEthAddress(
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
}
