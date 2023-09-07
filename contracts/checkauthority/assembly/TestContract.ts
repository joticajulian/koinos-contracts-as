// SPDX-License-Identifier: MIT
// Test contract for check authority
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { common } from "@koinosbox/contracts";

export class TestContract {
  callArgs: System.getArgumentsReturn | null;

  /**
   * my operation
   * @external
   */
  my_operation(args: common.address): common.boole {
    const isAuthorized = System.checkCallContractAuthority(args.account!);
    System.require(isAuthorized, "not authorized");
    return new common.boole(true);
  }
}
