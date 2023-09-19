// SPDX-License-Identifier: MIT
// Test contract for check authority
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { common } from "@koinosbox/contracts";

export class TestContract {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Function that checks if the user allows the current
   * operation by calling the check authority system call
   * @external
   */
  operate_assets(args: common.address): common.boole {
    const isAuthorized = System.checkCallContractAuthority(args.account!);
    System.require(isAuthorized, "not authorized");
    System.log("authorized to operate with the assets");
    return new common.boole(true);
  }
}
