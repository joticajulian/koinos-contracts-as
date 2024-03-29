import { System, Crypto, Protobuf, value, Arrays } from "@koinos/sdk-as";

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
}
