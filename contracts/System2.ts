import { System, Crypto, Protobuf, value, Arrays } from "@koinos/sdk-as";

export namespace System2 {
  export function getSigners(): Array<Uint8Array> {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const txId = System.getTransactionField("id")!.bytes_value!;

    const signers: Array<Uint8Array> = [];
    for (let i = 0; i < signatures.values.length; i++) {
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value!,
        txId
      );
      const address = Crypto.addressFromPublicKey(publicKey!);
      signers.push(address);
    }
    return signers;
  }

  /**
   * Internal function to validate the authority of an operation.
   * This function replaces the koinos native function called
   * "System.checkAuthority()".
   *
   * Why is this needed? let's take a look to the logic of
   * System.checkAuthority():
   *
   * - If the user has a smart contract wallet (and if it was
   *   tagged to resolve contract calls) then that contract is called.
   * - Otherwise the system will check if the transaction was signed
   *   by the user. This second point is risky because the flow of contract
   *   calls could be: A -> B -> C -> D. The user approved the operation
   *   in "A", but he doesn't know what will happen in B, C, or D and his
   *   signature is still in the transaction. Then some malicious contract
   *   in the middle could take advantage of this point to steal the assets.
   *
   * What changed in this system_check_authority function? It validates
   * the signature only if there is no caller. That is, only if the
   * contract was called directly by the user. In this way the assets
   * of the user are protected.
   *
   * Right now there is no way to know if an user has a smart contract
   * or not. Then for the moment the functionality to call the authorize
   * function is skipped while a new system call is developed.
   * If you want to develop smart contract wallets make sure to make
   * the calls from the smart contract wallet (be the caller) instead
   * of expecting a request in the authorize function.
   */
  export function check_authority(account: Uint8Array): boolean {
    const caller = System.getCaller();

    if (caller.caller && caller.caller!.length > 0) {
      // check if the account is the caller
      if (Arrays.equal(account, caller.caller)) return true;

      // other callers are rejected
      return false;
    }

    // there is no caller, then check if the account
    // signed the transaction
    const signers = System2.getSigners();
    for (let i = 0; i < signers.length; i += 1) {
      if (Arrays.equal(account, signers[i])) return true;
    }

    // none of the different options authorized the operation,
    // then it is rejected.
    return false;
  }
}
