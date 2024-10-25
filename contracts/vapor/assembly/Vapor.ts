// SPDX-License-Identifier: MIT
// Vapor Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { Storage, System, authority } from "@koinos/sdk-as";
import { IToken, Token, common, token } from "@koinosbox/contracts";
import { vapor } from "./proto/vapor";
import { multiplyAndDivide } from "./utils";

export class Vapor extends Token {
  _name: string = "Vapor";
  _symbol: string = "VAPOR";
  _decimals: u32 = 8;

  reentrantLocked: Storage.Obj<common.boole> = new Storage.Obj(
    this.contractId,
    900,
    common.boole.decode,
    common.boole.encode,
    () => new common.boole(false)
  );

  reentrantLock(): void {
    const reentrantLocked = this.reentrantLocked.get()!;
    System.require(reentrantLocked.value == false, "no reentrant");
    this.reentrantLocked.put(new common.boole(true));
  }

  reentrantUnlock(): void {
    this.reentrantLocked.put(new common.boole(false));
  }

  /**
   * Mint
   * @external
   */
  mint(args: token.mint_args): void {
    System.fail("mint disabled, use contribute");
  }

  /**
   * Transfer tokens
   * @external
   * @entrypoint 0x27f576ca
   */
  transfer2(args: token.transfer_args): common.boole {
    super.transfer(args);
    return new common.boole(true);
  }

  /**
   * Contribute with koins to the sponsors program, and get back
   * governance tokens
   * @external
   */
  contribute(args: vapor.contribute_args): void {
    this.reentrantLock();
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
          .value
      );
    }

    koinContract.transfer(
      new token.transfer_args(args.from!, this.contractId, args.value)
    );

    this._mint(new token.mint_args(args.from!, newTokens));
    this.reentrantUnlock();
  }

  /**
   * Claim koins by burning vapor
   * @external
   */
  claim(args: token.burn_args): void {
    this.reentrantLock();
    const isAuthorized = System.checkAccountAuthority(args.from!);
    System.require(isAuthorized, "claim operation not authorized");

    // Inverse process to the one computed in contribute:
    // delta_userKoin = delta_userVapor * koin_old / vapor_old

    const totalSupply = this.total_supply().value;
    System.require(totalSupply > 0, "there is no vapor in existence");

    const koinContract = new IToken(System.getContractAddress("koin"));
    const koinAmount = multiplyAndDivide(
      args.value,
      koinContract.balance_of(new token.balance_of_args(this.contractId)).value,
      totalSupply
    );

    this._burn(args);

    koinContract.transfer(
      new token.transfer_args(this.contractId, args.from!, koinAmount)
    );
    this.reentrantUnlock();
  }
}
