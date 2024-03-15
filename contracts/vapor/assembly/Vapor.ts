// SPDX-License-Identifier: MIT
// Vapor Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { IToken, Token, token } from "@koinosbox/contracts";
import { vapor } from "./proto/vapor";
import { multiplyAndDivide } from "./utils";

export class Vapor extends Token {
  _name: string = "Vapor";
  _symbol: string = "VAPOR";
  _decimals: u32 = 8;

  /**
   * Mint
   * @external
   */
  mint(args: token.mint_args): void {
    System.fail("mint disabled, use contribute");
  }

  /**
   * Contribute with koins to the sponsors program, and get back
   * governance tokens
   * @external
   */
  contribute(args: vapor.contribute_args): void {
    // The following relation must be preserved to not affect previous users:
    //
    // vapor_new / koin_new = vapor_old / koin_old
    //
    // where:
    // vapor_new = vapor_old + delta_userVapor
    // koin_new = koin_old + delta_userKoin
    //
    // after some maths the new vapor for the user is calculated as:
    // delta_userVapor = delta_userKoin * vapor_old / koin_old

    const koinContract = new IToken(System.getContractAddress("koin"));
    let newTokens: u64;
    const totalSupply = this.total_supply().value;
    if (totalSupply == 0) {
      newTokens = args.value;
    } else {
      newTokens = multiplyAndDivide(
        args.value,
        totalSupply,
        koinContract.balance_of(new token.balance_of_args(this.contractId))
      );
    }

    koinContract.transfer(
      new token.transfer_args(args.from!, this.contractId, args.value)
    );

    this._mint(new token.mint_args(args.from!, newTokens));
  }

  /**
   * Claim koins by burning vapor
   * @external
   */
  claim(args: token.burn_args): void {
    // Inverse process to the one computed in contribute:
    // delta_userKoin = delta_userVapor * koin_old / vapor_old
    
    const totalSupply = this.total_supply().value;
    System.require(totalSupply > 0, "there is no vapor in existence");

    const koinContract = new IToken(System.getContractAddress("koin"));
    const koinAmount = multiplyAndDivide(
        args.value,
        koinContract.balance_of(new token.balance_of_args(this.contractId)),
        totalSupply,
      );

    this._burn(args);

    koinContract.transfer(
      new token.transfer_args(this.contractId, args.from!, koinAmount)
    );
  }
}
