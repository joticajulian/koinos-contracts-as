import {
  Arrays,
  System,
  SafeMath,
  authority,
  Space,
} from "@koinos/sdk-as";
import { token } from "./proto/token";

const SUPPLY_ID = 0;
const BALANCES_SPACE_ID = 1;

const defaultKey = new Uint8Array(0);

export class Token {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "My Token";
  _symbol: string = "MMM";
  _decimals: u32 = 18;

  contractId: Uint8Array;
  supply: Space.Space<Uint8Array, token.uint64>;
  balances: Space.Space<Uint8Array, token.uint64>;

  constructor() {
    this.contractId = System.getContractId();
    this.supply = new Space.Space(
      this.contractId,
      SUPPLY_ID,
      token.uint64.decode,
      token.uint64.encode
    );
    this.balances = new Space.Space(
      this.contractId,
      BALANCES_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode
    );
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
    let supply = this.supply.get(defaultKey);
    if (!supply) return new token.uint64(0);
    return supply;
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): token.uint64 {
    let balanceOf = this.balances.get(args.owner);
    if (!balanceOf) return new token.uint64(0);
    return balanceOf;
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): token.boole {
    const from = args.from;
    const to = args.to;
    const value = args.value;

    if (Arrays.equal(from, to)) {
      System.log("Cannot transfer to self");
      return new token.boole(false);
    }

    const caller = System.getCaller();
    if (
      !Arrays.equal(from, caller.caller) &&
      !System.checkAuthority(
        authority.authorization_type.contract_call,
        from,
        this.callArgs!.args
      )
    ) {
      System.log("from has not authorized transfer");
      return new token.boole(false);
    }

    let fromBalance = this.balances.get(from);
    if (!fromBalance) fromBalance = new token.uint64(0);

    if (fromBalance.value < value) {
      System.log("'from' has insufficient balance");
      return new token.boole(false);
    }

    let toBalance = this.balances.get(to);
    if (!toBalance) toBalance = new token.uint64(0);

    fromBalance.value -= value;
    toBalance.value += value;

    this.balances.put(from, fromBalance);
    this.balances.put(to, toBalance);

    const impacted = [to, from];
    System.event("token.transfer", this.callArgs!.args, impacted);

    return new token.boole(true);
  }

  /**
   * Mint new tokens
   * @external
   */
  mint(args: token.mint_args): token.boole {
    const to = args.to;
    const value = args.value;

    const caller = System.getCaller();
    if (
      !Arrays.equal(this.contractId, caller.caller) &&
      !System.checkAuthority(
        authority.authorization_type.contract_call,
        this.contractId,
        this.callArgs!.args
      )
    ) {
      System.log("contract has not authorized mint");
      return new token.boole(false);
    }
    const supply = this.total_supply();

    const newSupply = SafeMath.tryAdd(supply.value, value);

    if (newSupply.error) {
      System.log("Mint would overflow supply");
      return new token.boole(false);
    }

    let toBalance = this.balances.get(to);
    if (!toBalance) toBalance = new token.uint64(0);
    toBalance.value += value;

    supply.value = newSupply.value;

    this.balances.put(to, toBalance);
    this.supply.put(defaultKey, supply);

    const impacted = [to];
    System.event("token.mint", this.callArgs!.args, impacted);

    return new token.boole(true);
  }

  /**
   * Burn tokens
   * @external
   */
  burn(args: token.burn_args): token.boole {
    const from = args.from;
    const value = args.value;

    const caller = System.getCaller();
    if (
      !Arrays.equal(from, caller.caller) &&
      !System.checkAuthority(
        authority.authorization_type.contract_call,
        from,
        this.callArgs!.args
      )
    ) {
      System.log("from has not authorized burn");
      return new token.boole(false);
    }

    let fromBalance = this.balances.get(from);
    if (!fromBalance) fromBalance = new token.uint64(0);

    if (fromBalance.value < value) {
      System.log("'from' has insufficient balance");
      return new token.boole(false);
    }

    const supply = this.total_supply();
    const newSupply = SafeMath.sub(supply.value, value);
    supply.value = newSupply;
    fromBalance.value -= value;

    this.balances.put(from, fromBalance);
    this.supply.put(defaultKey, supply);

    const impacted = [from];
    System.event("token.burn", this.callArgs!.args, impacted);

    return new token.boole(true);
  }
}