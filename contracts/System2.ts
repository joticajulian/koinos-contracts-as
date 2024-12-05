import {
  System,
  Crypto,
  Protobuf,
  value,
  Arrays,
  StringBytes,
  chain,
  Base58,
} from "@koinos/sdk-as";

export namespace System2 {
  export const NICKNAMES_CONTRACT_ID_HARBINGER = Base58.decode(
    "1KXsC2bSnKAMAZ51gq3xxKBo74a7cDJjkR"
  );

  export const NICKNAMES_CONTRACT_ID_MAINNET = Base58.decode(
    "1KD9Es7LBBjA1FY3ViCgQJ7e6WH1ipKbhz"
  );

  export const KAP_CONTRACT_ID_MAINNET = Base58.decode(
    "13tmzDmfqCsbYT26C4CmKxq86d33senqH3"
  );

  export const TEXTPARSERLIB_CONTRACT_ID_HARBINGER = Base58.decode(
    "1KfmATbZTgUqhcCTdAG9wGn9bwnAzArn4T"
  );

  export const TEXTPARSERLIB_CONTRACT_ID_MAINNET = Base58.decode(
    "18sGJzC8mNTAqVFw8wk5itftzwjPvQLAMX"
  );

  export const KONDOR_ELEMENTUS_CONTRACT_ID_HARBINGER = Base58.decode(
    "16dLj9rGLjfFreZ7wU689oEtXsxWX6ci3x"
  );

  export const KONDOR_ELEMENTUS_CONTRACT_ID_MAINNET = Base58.decode(
    "1EwJUW4BFbA4EGmSyB9bgdhB3gk2f3shRN"
  );

  export function hexString(buffer: Uint8Array): string {
    let hex = "0x";
    for (let i = 0; i < buffer.length; i += 1) {
      if (buffer[i] < 0x10) hex += "0";
      hex += buffer[i].toString(16);
    }
    return hex;
  }

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
    const hashEthMessage = System.hash(
      Crypto.multicodec.keccak_256,
      StringBytes.stringToBytes(ethMessage)
    );

    for (let i = 0; i < signatures.values.length; i++) {
      if (signatures.values[i].bytes_value.length != 65) continue;
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value,
        hashEthMessage!,
        chain.dsa.ecdsa_secp256k1,
        false
      );
      let multihashBytes = System.hash(
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
