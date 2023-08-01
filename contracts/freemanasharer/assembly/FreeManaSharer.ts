// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { System, authority } from "@koinos/sdk-as";

export class FreeManaSharer {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Authorize function
   * @external
   */
  authorize(args: authority.authorize_arguments): authority.authorize_result {
    if (args.type == authority.authorization_type.transaction_application) {
      System.log("authorization must be for transaction_application");
      return new authority.authorize_result(true);
    }
    return new authority.authorize_result(false);
  }
}
