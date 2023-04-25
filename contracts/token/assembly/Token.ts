import {
  Arrays,
  System,
  authority,
  Storage,
  Protobuf,
  Base58,
  StringBytes,
  value,
  Crypto,
} from "@koinos/sdk-as";
import { token } from "./proto/token";

const SUPPLY_SPACE_ID = 0;
const BALANCES_SPACE_ID = 1;
const ALLOWANCES_SPACE_ID = 2;
const USER_CONTRACTS_SPACE_ID = 3;

export const AUTHORIZE_CONTRACT_CALL_ENTRY_POINT = 0x10e5820f; // authorize_contract_call

export class Token {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "My Token";
  _symbol: string = "TKN";
  _decimals: u32 = 8;

  contractId: Uint8Array;
  supply: Storage.Obj<token.uint64>;
  balances: Storage.Map<Uint8Array, token.uint64>;
  allowances: Storage.Map<Uint8Array, token.uint64>;
  userContracts: Storage.Map<Uint8Array, token.boole>;

  constructor() {
    this.contractId = System.getContractId();
    this.supply = new Storage.Obj(
      this.contractId,
      SUPPLY_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      () => new token.uint64(0)
    );
    this.balances = new Storage.Map(
      this.contractId,
      BALANCES_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      () => new token.uint64(0)
    );
    this.allowances = new Storage.Map(
      this.contractId,
      ALLOWANCES_SPACE_ID,
      token.uint64.decode,
      token.uint64.encode,
      null
    );
    this.userContracts = new Storage.Map(
      this.contractId,
      USER_CONTRACTS_SPACE_ID,
      token.boole.decode,
      token.boole.encode,
      () => new token.boole(false)
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
    return this.supply.get()!;
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): token.uint64 {
    return this.balances.get(args.owner!)!;
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
    const allowance = this.allowances.get(key);
    if (!allowance) return new token.uint64(0);
    return allowance;
  }

  // TODO: add this function to the SDK
  getSigners(): Array<Uint8Array> {
    const sigBytes =
      System.getTransactionField("signatures")!.message_value!.value!;
    const signatures = Protobuf.decode<value.list_type>(
      sigBytes,
      value.list_type.decode
    );
    const txId = System.getTransactionField("id")!.bytes_value!;

    const signers: Array<Uint8Array> = [];
    for (let i = 0; i < signatures.values.length; i++) {
      const publicKey = System.recoverPublicKey(
        signatures.values[i].bytes_value!,
        txId
      );
      const address = Crypto.addressFromPublicKey(publicKey!);
      signers.push(address);
    }
    return signers;
  }

  /**
   * Internal function to call the contract of an account to request its
   * authority to perform an operation.
   */
  is_authorized_by_contract_account(account: Uint8Array): boolean {
    const caller = System.getCaller();
    const callRes = System.call(
      account,
      AUTHORIZE_CONTRACT_CALL_ENTRY_POINT,
      Protobuf.encode(
        new authority.authorize_arguments(
          authority.authorization_type.contract_call,
          new authority.call_data(
            this.contractId,
            this.callArgs!.entry_point,
            caller.caller,
            this.callArgs!.args
          )
        ),
        authority.authorize_arguments.encode
      )
    );
    if (callRes.code != 0) {
      const errorMessage = `failed to call contract of ${Base58.encode(
        account
      )}: ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : "unknown error"
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    System.require(
      callRes.res.object,
      `empty response from ${Base58.encode(account)}`
    );

    return Protobuf.decode<authority.authorize_result>(
      callRes.res.object!,
      authority.authorize_result.decode
    ).value;
  }

  /**
   * Internal function to validate the authority of an operation.
   * This function replaces the koinos native function called
   * "System.requireAuthority()". And it introduces new features to
   * increase the security of the contract.
   *
   * Why is this needed? let's take a look to the logic of
   * System.requireAuthority():
   *
   * - If the user has a smart contract wallet (and if it was
   *   tagged to resolve contract calls) then that contract is called.
   * - Otherwise the system will check if the transaction was signed
   *   by the user. This second point is risky because the flow of contract
   *   calls could be: A -> B -> C -> D. The user approved the operation
   *   in "A", but he doesn't know what will happen in B, C, or D and his
   *   signature is still in the transaction. Then some malicious contract
   *   in the middle could take advantage of this point to steal the assets.
   *
   * What changed in this check_authority function? It implements approvals
   * and checks who is the caller:
   *
   * - If there is a caller (that is, if this operation was not triggered
   *   by the user itself but by some contract in the middle), it is approved
   *   if one of the following conditions are met:
   *     1. The caller is approved by the user (for the specific amount).
   *     2. The caller is the user.
   *     3. The user has a contract and this contract authorizes the operation.
   * - If there is NO caller (that is, if this operation appears in the list
   *   of operations in the transaction, not called by some contract in the
   *   middle) then the contract will check if one of the following conditions
   *   are met:
   *     1. The transaction is signed by an account approved by the user (for
   *        the specific amount).
   *     2. The user has a contract and this contract authorizes the operation.
   *     3. The transaction is signed by the user, but with the condition that
   *        the user doesn't have a contract.
   *
   * Note: Currently there is no a system call to check if an account has
   * a smart contract wallet or not. Then as a temporal solution, the user has
   * to call "set_authority_contract" to define that he uses a smart contract
   * wallet.
   */
  check_authority(
    account: Uint8Array,
    acceptAllowances: boolean,
    amount: u64
  ): boolean {
    const caller = System.getCaller();

    const key = new Uint8Array(50);
    if (acceptAllowances) {
      key.set(account, 0);
    }

    // check if there is a caller (smart contract in the middle)
    if (caller.caller && caller.caller!.length > 0) {
      if (acceptAllowances) {
        // check if the caller is approved for all tokens
        key.set(caller.caller!, 25);
        const allowance = this.allowances.get(key);
        if (allowance && allowance.value >= amount) {
          // spend allowance
          allowance.value -= amount;
          this.allowances.put(key, allowance);
          return true;
        }
      }

      // check if the account is the caller
      if (Arrays.equal(account, caller.caller)) return true;

      // check if the contract of the account authorizes the operation
      // TODO: to be replaced by the system call to get contract metadata
      if (this.userContracts.get(account)!.value == true) {
        System.log("Account contract called to resolve the authority");
        return this.is_authorized_by_contract_account(account);
      }

      // the transaction has a caller but none of the different
      // options authorized the operation, then it is rejected.
      return false;
    }

    // check the signatures related to allowances
    const signers = this.getSigners();
    for (let i = 0; i < signers.length; i += 1) {
      if (acceptAllowances) {
        // check if the signer is approved for all tokens
        key.set(signers[i], 25);
        const allowance = this.allowances.get(key);
        if (allowance && allowance.value >= amount) {
          // spend allowance
          allowance.value -= amount;
          this.allowances.put(key, allowance);
          return true;
        }
      }
    }

    // check if the account has a contract
    if (this.userContracts.get(account)!.value == true) {
      // consult the contract of the account
      System.log("Account contract called to resolve the authority");
      return this.is_authorized_by_contract_account(account);
    }

    // there is no caller, no approval from allowances, and the account
    // doesn't have a contract then check if the account signed the transaction
    for (let i = 0; i < signers.length; i += 1) {
      if (Arrays.equal(account, signers[i])) return true;
    }

    // none of the different options authorized the operation,
    // then it is rejected.
    return false;
  }

  _approve(args: token.approve_args): void {
    const key = new Uint8Array(50);
    key.set(args.owner!, 0);
    key.set(args.spender!, 25);
    this.allowances.put(key, new token.uint64(args.value));

    const impacted = [args.spender!, args.owner!];
    System.event(
      "koinos.contracts.token.approve_event",
      this.callArgs!.args,
      impacted
    );
  }

  _transfer(args: token.transfer_args): void {
    let fromBalance = this.balances.get(args.from!)!;
    System.require(
      fromBalance.value >= args.value,
      "account 'from' has insufficient balance"
    );
    fromBalance.value -= args.value;
    this.balances.put(args.from!, fromBalance);

    let toBalance = this.balances.get(args.to!)!;
    toBalance.value += args.value;
    this.balances.put(args.to!, toBalance);

    const impacted = [args.to!, args.from!];
    System.event(
      "koinos.contracts.token.transfer_event",
      Protobuf.encode<token.transfer_args>(args, token.transfer_args.encode),
      impacted
    );
  }

  _mint(args: token.mint_args): void {
    const supply = this.supply.get()!;
    System.require(
      supply.value <= u64.MAX_VALUE - args.value,
      "mint would overflow supply"
    );

    let toBalance = this.balances.get(args.to!)!;
    toBalance.value += args.value;
    this.balances.put(args.to!, toBalance);
    supply.value += args.value;
    this.supply.put(supply);

    const impacted = [args.to!];
    System.event(
      "koinos.contracts.token.mint_event",
      Protobuf.encode<token.mint_args>(args, token.mint_args.encode),
      impacted
    );
  }

  _burn(args: token.burn_args): void {
    let fromBalance = this.balances.get(args.from!)!;
    System.require(
      fromBalance.value >= args.value,
      "account 'from' has insufficient balance"
    );

    const supply = this.supply.get()!;
    fromBalance.value -= args.value;
    this.balances.put(args.from!, fromBalance);
    supply.value -= args.value;
    this.supply.put(supply);

    const impacted = [args.from!];
    System.event(
      "koinos.contracts.token.burn_event",
      Protobuf.encode<token.burn_args>(args, token.burn_args.encode),
      impacted
    );
  }

  /**
   * Function to define if the user has a smart contract wallet or not
   * to resolve the authority when making transfers or burns.
   *
   * Note: This is a temporary function while a new System call is
   * developed in koinos to get the contract metadata
   */
  set_authority_contract(args: token.set_authority_contract_args): void {
    const isAuthorized = this.check_authority(args.account!, false, 0);
    System.require(
      isAuthorized,
      "set_authority_contract operation not authorized"
    );

    // test a call
    System.require(
      this.is_authorized_by_contract_account(args.account!),
      "not authorized by contract account"
    );

    this.userContracts.put(args.account!, new token.boole(args.enabled));

    System.event(
      "koinos.contracts.token.set_authority_contract_event",
      this.callArgs!.args,
      [args.account!]
    );
  }

  /**
   * Grant permissions to other account to manage the tokens owned
   * by the user. The user must approve only the accounts he trust.
   * @external
   */
  approve(args: token.approve_args): void {
    const isAuthorized = this.check_authority(args.owner!, false, 0);
    System.require(isAuthorized, "approve operation not authorized");
    this._approve(args);
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): void {
    const isAuthorized = this.check_authority(args.from!, true, args.value);
    System.require(isAuthorized, "from has not authorized transfer");
    this._transfer(args);
  }

  /**
   * Mint new tokens
   * @external
   */
  mint(args: token.mint_args): void {
    const isAuthorized = this.check_authority(this.contractId, false, 0);
    System.require(isAuthorized, "owner has not authorized mint");
    this._mint(args);
  }
}
