// SPDX-License-Identifier: MIT
// Test contract for third party
// Julian Gonzalez (joticajulian@gmail.com)

import { System, Base58 } from "@koinos/sdk-as";
import { common, IToken, token } from "@koinosbox/contracts";

const TOKEN_CONTRACT_ID = Base58.decode("1J4zARiyrx311ZcN3ipz3zJ61D5m8byKDU");

export class TestThirdParty {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Take 10 tokens from an account
   * @external
   */
  operate_external_assets(args: common.address): void {
    const tok = new IToken(TOKEN_CONTRACT_ID);
    tok.transfer(
      new token.transfer_args(args.account, System.getContractId(), 10)
    );
  }
}
