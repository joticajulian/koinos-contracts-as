// SPDX-License-Identifier: MIT
// Test wallet
// Julian Gonzalez (joticajulian@gmail.com)

import { System, authority, Storage, Base58, Base64 } from "@koinos/sdk-as";
import { common, IToken, token } from "@koinosbox/contracts";

const TEST_THIRD_PARTY_CONTRACT_ID = Base58.decode(
  "1KX63U9TuBFsix7ej8VU8MsRr1AtK9jaEq"
);
const TOKEN_CONTRACT_ID = Base58.decode("1J4zARiyrx311ZcN3ipz3zJ61D5m8byKDU");

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
   * direct call to make a transfer
   * @external
   */
  direct_call(): void {
    const tok = new IToken(TOKEN_CONTRACT_ID);
    tok.transfer(
      new token.transfer_args(this.contractId, TEST_THIRD_PARTY_CONTRACT_ID, 10)
    );
  }
}
