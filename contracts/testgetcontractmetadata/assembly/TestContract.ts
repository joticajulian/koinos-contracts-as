// SPDX-License-Identifier: MIT
// Test contract for check authority
// Julian Gonzalez (joticajulian@gmail.com)

import { System, authority } from "@koinos/sdk-as";
import { common } from "./proto/common";

export class TestContract {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Function that checks if the user allows the current
   * operation by calling the check authority system call
   * @external
   */
  operate_assets(args: common.address): common.boole {
    const isAuthorized = System.checkAuthority(
      authority.authorization_type.contract_call,
      args.value!
    );
    System.require(isAuthorized, "not authorized");
    System.log("authorized to operate with the assets");
    return new common.boole(true);
  }
}
