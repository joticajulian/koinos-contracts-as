// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  Arrays,
  Crypto,
  Protobuf,
  authority,
  value,
} from "@koinos/sdk-as";

import { common } from "./proto/common";

export class ManaSharer {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array;

  managers: Storage.Map<Uint8Array, common.boole>;

  constructor() {
    this.contractId = System.getContractId();
    this.managers = new Storage.Map(
      this.contractId,
      1,
      common.boole.decode,
      common.boole.encode,
      () => new common.boole(false)
    );
  }

  // TODO: add this function to the SDK
  getSigners(): Array<Uint8Array> {
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
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): common.boole {
    // check if the transaction is signed with the
    // private key of the contract
    const signers = this.getSigners();
    for (let i = 0; i < signers.length; i += 1) {
      if (Arrays.equal(signers[i], this.contractId))
        return new common.boole(true);
    }

    if (args.type != authority.authorization_type.transaction_application) {
      System.log("authorization must be for transaction_application");
      return new common.boole(false);
    }

    // check if one of the signers is a manager
    for (let i = 0; i < signers.length; i += 1) {
      const manager = this.managers.get(signers[i])!;
      if (manager.value == true) return new common.boole(true);
    }

    return new common.boole(false);
  }

  /**
   * function to check if the transaction is signed with
   * the private key of the contract
   */
  isSignedByOwner(): boolean {
    const signers = this.getSigners();
    for (let i = 0; i < signers.length; i += 1) {
      if (Arrays.equal(signers[i], this.contractId)) return true;
    }
    return false;
  }

  /**
   * Add a manager of the mana
   * @external
   * @event manager_added common.address
   */
  add_manager(args: common.address): void {
    System.require(this.isSignedByOwner(), "not signed by the owner");
    this.managers.put(args.account!, new common.boole(true));
    System.event("manager_added", this.callArgs!.args, [args.account!]);
  }

  /**
   * Remove a manager of the mana
   * @external
   * @event manager_removed common.address
   */
  remove_manager(args: common.address): void {
    System.require(this.isSignedByOwner(), "not signed by the owner");
    this.managers.remove(args.account!);
    System.event("manager_removed", this.callArgs!.args, [args.account!]);
  }

  /**
   * Get managers
   * @external
   * @readonly
   */
  get_managers(args: common.list_args): common.addresses {
    const direction =
      args.direction == common.direction.ascending
        ? Storage.Direction.Ascending
        : Storage.Direction.Descending;
    const accounts = this.managers.getManyKeys(
      args.start ? args.start! : new Uint8Array(0),
      args.limit,
      direction
    );
    return new common.addresses(accounts);
  }
}
