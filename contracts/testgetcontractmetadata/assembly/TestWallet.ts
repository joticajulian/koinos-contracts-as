// SPDX-License-Identifier: MIT
// Test wallet
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  authority,
  Storage,
  Base58,
  Base64,
  Protobuf,
  StringBytes,
} from "@koinos/sdk-as";
import { common } from "@koinosbox/contracts";

export class TestWallet {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array = System.getContractId();

  allowance: Storage.Obj<common.boole> = new Storage.Obj(
    this.contractId,
    0,
    common.boole.decode,
    common.boole.encode,
    () => new common.boole(false)
  );

  testContractId: Storage.Obj<common.address> = new Storage.Obj(
    this.contractId,
    1,
    common.address.decode,
    common.address.encode
  );

  /**
   * authorize
   * @external
   */
  authorize(args: authority.authorize_arguments): authority.authorize_result {
    System.log("authorize called");
    const allowance = this.allowance.get()!;
    System.log(`type: ${args.type}`);
    if (args.call) {
      if (args.call!.caller && args.call!.caller.length > 0)
        System.log(`caller: ${Base58.encode(args.call!.caller)}`);
      else System.log("no caller");
      System.log(`contract id: ${Base58.encode(args.call!.contract_id)}`);
      System.log(`data: ${Base64.encode(args.call!.data)}`);
      System.log(`entry point: ${args.call!.entry_point}`);
    }
    return new authority.authorize_result(allowance.value);
  }

  /**
   * set allowance
   * @external
   */
  set_allowance(args: common.boole): void {
    this.allowance.put(args);
  }

  /**
   * set test contract id
   * @external
   */
  set_test_contract_id(args: common.address): void {
    this.testContractId.put(args);
  }
}
