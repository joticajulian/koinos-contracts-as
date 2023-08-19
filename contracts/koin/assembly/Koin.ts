// SPDX-License-Identifier: MIT
// Koin Contract v0.0.0
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  Protobuf,
  Arrays,
  Base58,
  koin,
  system_calls,
  chain,
} from "@koinos/sdk-as";
import { System2, token } from "@koinosbox/contracts";
import { u128 } from "as-bignum";

const SUPPLY_SPACE_ID = 0;
const BALANCES_SPACE_ID = 1;
const ALLOWANCES_SPACE_ID = 2;

const KOIN_ZONE = Base58.decode("15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL");
const MANA_REGEN_TIME_MS: u64 = 432000000; // 5 days

export class Koin {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "Koin";
  _symbol: string = "KOIN";
  _decimals: u32 = 8;

  supply: Storage.Obj<token.uint64> = new Storage.Obj(
    KOIN_ZONE,
    SUPPLY_SPACE_ID,
    token.uint64.decode,
    token.uint64.encode,
    () => new token.uint64(0),
    true
  );

  balances: Storage.Map<Uint8Array, koin.mana_balance_object> = new Storage.Map(
    KOIN_ZONE,
    BALANCES_SPACE_ID,
    koin.mana_balance_object.decode,
    koin.mana_balance_object.encode,
    () => new koin.mana_balance_object(0, 0, 0),
    true
  );

  allowances: Storage.Map<Uint8Array, token.uint64> = new Storage.Map(
    KOIN_ZONE,
    ALLOWANCES_SPACE_ID,
    token.uint64.decode,
    token.uint64.encode,
    () => new token.uint64(0),
    true
  );

  regenerate_mana(bal: koin.mana_balance_object): void {
    const headBlockTime = System.getHeadInfo().head_block_time;
    let delta = headBlockTime - bal.last_mana_update;
    if (MANA_REGEN_TIME_MS < delta) delta = MANA_REGEN_TIME_MS;
    if (delta == 0) return;
    const newMana =
      bal.mana +
      (
        (u128.fromU64(delta) * u128.fromU64(bal.balance)) /
        u128.fromU64(MANA_REGEN_TIME_MS)
      ).toU64();
    bal.mana = bal.balance > newMana ? newMana : bal.balance;
    bal.last_mana_update = headBlockTime;
  }

  /**
   * Get account RC
   * @external
   * @readonly
   */
  get_account_rc(
    args: system_calls.get_account_rc_arguments
  ): system_calls.get_account_rc_result {
    if (Arrays.equal(args.account!, System.getContractAddress("governance"))) {
      return new system_calls.get_account_rc_result(u64.MAX_VALUE);
    }
    const balance = this.balances.get(args.account!)!;
    this.regenerate_mana(balance);
    return new system_calls.get_account_rc_result(balance.mana);
  }

  /**
   * Consume account RC
   * @external
   */
  consume_account_rc(
    args: system_calls.consume_account_rc_arguments
  ): system_calls.consume_account_rc_result {
    const caller = System.getCaller();
    if (caller.caller_privilege != chain.privilege.kernel_mode) {
      System.log(
        "The system call consume_account_rc must be called from kernel context"
      );
      return new system_calls.consume_account_rc_result(false);
    }

    const balance = this.balances.get(args.account!)!;
    this.regenerate_mana(balance);

    if (balance.mana < args.value) {
      System.log("Account has insufficient mana for consumption");
      return new system_calls.consume_account_rc_result(false);
    }

    balance.mana -= args.value;
    this.balances.put(args.account!, balance);
    return new system_calls.consume_account_rc_result(true);
  }

  /**
   * Get name of the token
   * @external
   * @readonly
   */
  name(): token.str {
    return new token.str(this._name);
  }

  /**
   * Get the symbol of the token
   * @external
   * @readonly
   */
  symbol(): token.str {
    return new token.str(this._symbol);
  }

  /**
   * Get the decimals of the token
   * @external
   * @readonly
   */
  decimals(): token.uint32 {
    return new token.uint32(this._decimals);
  }

  /**
   * Get name, symbol and decimals
   * @external
   * @readonly
   */
  get_info(): token.info {
    return new token.info(this._name, this._symbol, this._decimals);
  }

  /**
   * Get total supply
   * @external
   * @readonly
   */
  total_supply(): token.uint64 {
    return this.supply.get()!;
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): token.uint64 {
    return new token.uint64(this.balances.get(args.owner!)!.balance);
  }

  /**
   * Get allowance
   * @external
   * @readonly
   */
  allowance(args: token.allowance_args): token.uint64 {
    const key = new Uint8Array(50);
    key.set(args.owner!, 0);
    key.set(args.spender!, 25);
    return this.allowances.get(key)!;
  }

  /**
   * Get allowances of an account
   * @external
   * @readonly
   */
  get_allowances(args: token.get_allowances_args): token.get_allowances_return {
    let key = new Uint8Array(50);
    key.set(args.owner!, 0);
    key.set(args.start ? args.start! : new Uint8Array(0), 25);
    const result = new token.get_allowances_return(args.owner!, []);
    for (let i = 0; i < args.limit; i += 1) {
      const nextAllowance =
        args.direction == token.direction.ascending
          ? this.allowances.getNext(key)
          : this.allowances.getPrev(key);
      if (
        !nextAllowance ||
        !Arrays.equal(args.owner!, nextAllowance.key!.slice(0, 25))
      )
        break;
      const spender = nextAllowance.key!.slice(25);
      result.allowances.push(
        new token.spender_value(spender, nextAllowance.value.value)
      );
      key = nextAllowance.key!;
    }
    return result;
  }

  /**
   * Internal function to check if the account triggered
   * the operation, or if another account is authorized
   */
  check_authority(account: Uint8Array, amount: u64): boolean {
    // check if the operation is authorized directly by the user
    if (System2.check_authority(account)) return true;

    // check if the user authorized the caller
    const caller = System.getCaller();
    if (!caller.caller || caller.caller!.length == 0) return false;
    const key = new Uint8Array(50);
    key.set(account, 0);
    key.set(caller.caller!, 25);
    const allowance = this.allowances.get(key)!;
    if (allowance.value >= amount) {
      // spend allowance
      allowance.value -= amount;
      this.allowances.put(key, allowance);
      return true;
    }

    return false;
  }

  /**
   * Grant permissions to other account to manage the tokens owned
   * by the user. The user must approve only the accounts he trust.
   * @external
   */
  approve(args: token.approve_args): void {
    const isAuthorized = System2.check_authority(args.owner!);
    System.require(isAuthorized, "approve operation not authorized");
    const key = new Uint8Array(50);
    key.set(args.owner!, 0);
    key.set(args.spender!, 25);
    this.allowances.put(key, new token.uint64(args.value));

    const impacted = [args.spender!, args.owner!];
    System.event(
      "token.approve_event",
      Protobuf.encode<token.approve_args>(args, token.approve_args.encode),
      impacted
    );
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): void {
    const isAuthorized = this.check_authority(args.from!, args.value);
    System.require(isAuthorized, "from has not authorized transfer");

    let fromBalance = this.balances.get(args.from!)!;
    System.require(
      fromBalance.balance >= args.value,
      "account 'from' has insufficient balance"
    );
    this.regenerate_mana(fromBalance);
    System.require(
      fromBalance.mana >= args.value,
      "account 'from' has insufficient mana for transfer"
    );
    fromBalance.balance -= args.value;
    fromBalance.mana -= args.value;
    this.balances.put(args.from!, fromBalance);

    let toBalance = this.balances.get(args.to!)!;
    this.regenerate_mana(toBalance);
    toBalance.balance += args.value;
    toBalance.mana += args.value;
    this.balances.put(args.to!, toBalance);

    const impacted = [args.to!, args.from!];
    System.event(
      "token.transfer_event",
      Protobuf.encode<token.transfer_args>(args, token.transfer_args.encode),
      impacted
    );
  }

  /**
   * Mint new tokens
   * @external
   */
  mint(args: token.mint_args): void {
    const caller = System.getCaller();
    System.require(
      caller.caller_privilege == chain.privilege.kernel_mode,
      "The system call consume_account_rc must be called from kernel context"
    );
    const supply = this.supply.get()!;
    System.require(
      supply.value <= u64.MAX_VALUE - args.value,
      "mint would overflow supply"
    );

    let toBalance = this.balances.get(args.to!)!;
    this.regenerate_mana(toBalance);
    toBalance.balance += args.value;
    toBalance.mana += args.value;
    this.balances.put(args.to!, toBalance);
    supply.value += args.value;
    this.supply.put(supply);

    const impacted = [args.to!];
    System.event(
      "token.mint_event",
      Protobuf.encode<token.mint_args>(args, token.mint_args.encode),
      impacted
    );
  }

  /**
   * Burn koin
   * @external
   */
  burn(args: token.burn_args): void {
    const isAuthorized = this.check_authority(args.from!, args.value);
    System.require(isAuthorized, "from has not authorized transfer");

    let fromBalance = this.balances.get(args.from!)!;
    System.require(
      fromBalance.balance >= args.value,
      "account 'from' has insufficient balance"
    );
    this.regenerate_mana(fromBalance);
    System.require(
      fromBalance.mana >= args.value,
      "account 'from' has insufficient mana for burn"
    );
    const supply = this.supply.get()!;
    System.require(supply.value >= args.value, "burn would underflow supply");
    fromBalance.balance -= args.value;
    fromBalance.mana -= args.value;
    this.balances.put(args.from!, fromBalance);
    supply.value -= args.value;
    this.supply.put(supply);

    const impacted = [args.from!];
    System.event(
      "token.burn_event",
      Protobuf.encode<token.burn_args>(args, token.burn_args.encode),
      impacted
    );
  }
}
