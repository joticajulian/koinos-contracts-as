import { System } from "@koinos/sdk-as";
import { BURNKOIN_CONTRACT_ID, PVHP_CONTRACT_ID } from "./constants";
import { Burnkoin } from "./IBurnkoin";
import { Token } from "./IToken";
import { burnkoin } from "./proto/burnkoin";
import { token } from "./proto/token";

export class Burnkoinhelper {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Swap vhp for koin
   * @external
   */
  swap(args: burnkoin.swap_args): void {
    const account = args.account!;
    const vhpAmount = args.value;
    const tolerance = args.tolerance;

    const pvhpContract = new Token(PVHP_CONTRACT_ID);
    const burnkoinContract = new Burnkoin(BURNKOIN_CONTRACT_ID);
    const koinContract = new Token(System.getContractAddress("koin"));

    // balance args
    const myAccount = new token.balance_of_args(account);

    // deposit VHP and get the new pVHP
    const pvhpBalance = pvhpContract.balance_of(myAccount).value;
    burnkoinContract.deposit_vhp(
      new burnkoin.burnkoin_args(account, vhpAmount)
    );
    const newPvhpBalance = pvhpContract.balance_of(myAccount).value;
    System.require(
      newPvhpBalance >= pvhpBalance,
      "internal error: new pvhp balance is lower than old pvhp balance"
    );
    const pVhpToConvert = newPvhpBalance - pvhpBalance;

    // withdraw koin by sending pVHP
    const koinBalance = koinContract.balance_of(myAccount).value;
    burnkoinContract.withdraw_koin(
      new burnkoin.burnkoin_args(account, pVhpToConvert)
    );
    const newKoinBalance = koinContract.balance_of(myAccount).value;
    System.require(
      newKoinBalance >= koinBalance,
      "internal error: new koin balance is lower than old koin balance"
    );
    const koinConverted = newKoinBalance - koinBalance;
    System.require(
      koinConverted + tolerance >= vhpAmount,
      `error: with a deposit of ${vhpAmount} satoshis-VHP burnkoin returns ${koinConverted} satoshis-KOIN. If you agree, increase the tolerance`
    );
  }
}
