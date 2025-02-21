// SPDX-License-Identifier: MIT
// NFT Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { Arrays, System, Storage, Protobuf, authority } from "@koinos/sdk-as";
import { common } from "@koinosbox/contracts";
import { nft } from "./proto/nft";

const SUPPLY_SPACE_ID = 0;
const BALANCES_SPACE_ID = 1;
const ROYALTIES_SPACE_ID = 2;
const TOKEN_OWNERS_SPACE_ID = 3;
const TOKENS_BY_OWNER_SPACE_ID = 4;
const TOKEN_METADATA_SPACE_ID = 5;
const TOKEN_APPROVALS_SPACE_ID = 6;
const TOKEN_OPERATOR_APPROVALS_SPACE_ID = 7;
const COLLECTION_OWNER_SPACE_ID = 8;

const MAX_TOKEN_ID_LENGTH = 32;

export const ONE_HUNDRED_PERCENT: u64 = 10000;

export class Nft {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "My NFT";
  _symbol: string = "NFT";
  _uri: string = "";

  contractId: Uint8Array = System.getContractId();

  supply: Storage.Obj<common.uint64> = new Storage.Obj(
    this.contractId,
    SUPPLY_SPACE_ID,
    common.uint64.decode,
    common.uint64.encode,
    () => new common.uint64(0)
  );

  balances: Storage.Map<Uint8Array, common.uint64> = new Storage.Map(
    this.contractId,
    BALANCES_SPACE_ID,
    common.uint64.decode,
    common.uint64.encode,
    () => new common.uint64(0)
  );

  _royalties: Storage.Obj<nft.royalties> = new Storage.Obj(
    this.contractId,
    ROYALTIES_SPACE_ID,
    nft.royalties.decode,
    nft.royalties.encode,
    () => new nft.royalties()
  );

  tokenOwners: Storage.Map<Uint8Array, common.address> = new Storage.Map(
    this.contractId,
    TOKEN_OWNERS_SPACE_ID,
    common.address.decode,
    common.address.encode,
    () => new common.address()
  );

  tokenOwnerPairs: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    TOKENS_BY_OWNER_SPACE_ID,
    common.boole.decode,
    common.boole.encode,
    () => new common.boole(false)
  );

  tokenMetadata: Storage.Map<Uint8Array, common.str> = new Storage.Map(
    this.contractId,
    TOKEN_METADATA_SPACE_ID,
    common.str.decode,
    common.str.encode,
    () => new common.str("")
  );

  tokenApprovals: Storage.Map<Uint8Array, common.address> = new Storage.Map(
    this.contractId,
    TOKEN_APPROVALS_SPACE_ID,
    common.address.decode,
    common.address.encode,
    () => new common.address()
  );

  operatorApprovals: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    TOKEN_OPERATOR_APPROVALS_SPACE_ID,
    common.boole.decode,
    common.boole.encode,
    () => new common.boole(false)
  );

  collectionOwner: Storage.Obj<common.address> = new Storage.Obj(
    this.contractId,
    COLLECTION_OWNER_SPACE_ID,
    common.address.decode,
    common.address.encode
  );

  /**
   * Get name of the NFT
   * @external
   * @readonly
   */
  name(): common.str {
    return new common.str(this._name);
  }

  /**
   * Get the symbol of the NFT
   * @external
   * @readonly
   */
  symbol(): common.str {
    return new common.str(this._symbol);
  }

  /**
   * Get URI of the NFT
   * @external
   * @readonly
   */
  uri(): common.str {
    return new common.str(this._uri);
  }

  /**
   * Get name, symbol and decimals
   * @external
   * @readonly
   */
  get_info(): nft.info {
    return new nft.info(this._name, this._symbol, this._uri);
  }

  /**
   * Get the owner of the collection
   * @external
   * @readonly
   */
  owner(): common.address {
    const owner = this.collectionOwner.get();
    if (!owner) return new common.address(this.contractId);
    return owner;
  }

  /**
   * Get total supply
   * @external
   * @readonly
   */
  total_supply(): common.uint64 {
    return this.supply.get()!;
  }

  /**
   * Get royalties
   * @external
   * @readonly
   */
  royalties(): nft.royalties {
    return this._royalties.get()!;
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: nft.balance_of_args): common.uint64 {
    return this.balances.get(args.owner!)!;
  }

  /**
   * Get the owner of a token
   * @external
   * @readonly
   */
  owner_of(args: nft.token): common.address {
    return this.tokenOwners.get(args.token_id!)!;
  }

  /**
   * Get the metadata of a token
   * @external
   * @readonly
   */
  metadata_of(args: nft.token): common.str {
    return this.tokenMetadata.get(args.token_id!)!;
  }

  /**
   * Get list of token IDs
   * @external
   * @readonly
   */
  get_tokens(args: nft.get_tokens_args): nft.token_ids {
    const direction = args.descending
      ? Storage.Direction.Descending
      : Storage.Direction.Ascending;
    const tokenIds = this.tokenOwners.getManyKeys(
      args.start ? args.start! : new Uint8Array(0),
      args.limit,
      direction
    );
    return new nft.token_ids(tokenIds);
  }

  /**
   * Get tokens owned by an address
   * @external
   * @readonly
   */
  get_tokens_by_owner(args: nft.get_tokens_by_owner_args): nft.token_ids {
    let key = new Uint8Array(26 + MAX_TOKEN_ID_LENGTH);
    key.set(args.owner!, 0);
    if (args.start) {
      key[25] = args.start!.length;
      key.set(args.start!, 26);
    }
    const result = new nft.token_ids([]);
    for (let i = 0; i < args.limit; i += 1) {
      const nextTokenOwnerPair = args.descending
        ? this.tokenOwnerPairs.getPrev(key)
        : this.tokenOwnerPairs.getNext(key);
      if (
        !nextTokenOwnerPair ||
        !Arrays.equal(args.owner!, nextTokenOwnerPair.key!.slice(0, 25))
      )
        break;
      const tokenIdLength = nextTokenOwnerPair.key![25];
      const tokenId = nextTokenOwnerPair.key!.slice(26, 26 + tokenIdLength);
      result.token_ids.push(tokenId);
      key = nextTokenOwnerPair.key!;
    }
    return result;
  }

  /**
   * Check if an account is approved to operate a token ID
   * @external
   * @readonly
   */
  get_approved(args: nft.token): common.address {
    return this.tokenApprovals.get(args.token_id!)!;
  }

  /**
   * Check if an account is approved to operate all tokens
   * owned by other account
   * @external
   * @readonly
   */
  is_approved_for_all(args: nft.is_approved_for_all_args): common.boole {
    const key = new Uint8Array(50);
    key.set(args.owner!, 0);
    key.set(args.operator!, 25);
    return this.operatorApprovals.get(key)!;
  }

  /**
   * Get allowances of an account
   * @external
   * @readonly
   */
  get_operator_approvals(
    args: nft.get_operators_args
  ): nft.get_operators_return {
    let key = new Uint8Array(50);
    key.set(args.owner!, 0);
    key.set(args.start ? args.start! : new Uint8Array(0), 25);
    const result = new nft.get_operators_return(args.owner!, []);
    for (let i = 0; i < args.limit; i += 1) {
      const nextAllowance = args.descending
        ? this.operatorApprovals.getPrev(key)
        : this.operatorApprovals.getNext(key);
      if (
        !nextAllowance ||
        !Arrays.equal(args.owner!, nextAllowance.key!.slice(0, 25))
      )
        break;
      const operator = nextAllowance.key!.slice(25);
      result.operators.push(operator);
      key = nextAllowance.key!;
    }
    return result;
  }

  /**
   * Internal function to check if the account triggered
   * the operation, or if another account is authorized
   */
  check_authority(account: Uint8Array, token_id: Uint8Array): boolean {
    // check if the user authorized the caller
    const caller = System.getCaller().caller;
    if (caller && caller.length > 0) {
      // check if approved for the token
      const approvedAddress = this.tokenApprovals.get(token_id)!.value;
      if (Arrays.equal(approvedAddress, caller)) {
        // clear temporal approval
        this.tokenApprovals.remove(token_id);
        return true;
      }

      // check if approved for all
      const key = new Uint8Array(50);
      key.set(account, 0);
      key.set(caller, 25);
      if (this.operatorApprovals.get(key)!.value == true) return true;
    }

    // check if the operation is authorized directly by the user
    return System.checkAccountAuthority(account);
  }

  _transfer_ownership(args: common.address): void {
    this.collectionOwner.put(args);
    System.event(
      "collections.owner_event",
      Protobuf.encode<common.address>(args, common.address.encode),
      [this.owner().value!, args.value!]
    );
  }

  _set_royalties(args: nft.royalties): void {
    const impacted: Uint8Array[] = [];
    let totalPercentage: u64 = 0;
    for (let i = 0; i < args.value.length; i += 1) {
      totalPercentage += args.value[i].percentage;
      impacted.push(args.value[i].address!);
      System.require(
        args.value[i].percentage <= ONE_HUNDRED_PERCENT &&
          totalPercentage <= ONE_HUNDRED_PERCENT,
        "the percentages for royalties exceeded 100%"
      );
    }
    this._royalties.put(args);
    System.event(
      "collections.royalties_event",
      Protobuf.encode<nft.royalties>(args, nft.royalties.encode),
      impacted
    );
  }

  _set_metadata(args: nft.metadata_args): void {
    this.tokenMetadata.put(args.token_id!, new common.str(args.metadata));
    System.event(
      "collections.set_metadata_event",
      Protobuf.encode<nft.metadata_args>(args, nft.metadata_args.encode),
      []
    );
  }

  _approve(args: nft.approve_args): void {
    this.tokenApprovals.put(args.token_id!, new common.address(args.to!));
    const impacted = [args.to!, args.approver_address!];
    System.event(
      "collections.token_approval_event",
      Protobuf.encode<nft.approve_args>(args, nft.approve_args.encode),
      impacted
    );
  }

  _set_approval_for_all(args: nft.set_approval_for_all_args): void {
    const key = new Uint8Array(50);
    key.set(args.approver_address!, 0);
    key.set(args.operator_address!, 25);
    this.operatorApprovals.put(key, new common.boole(args.approved));

    const impacted = [args.operator_address!, args.approver_address!];
    System.event(
      "collections.operator_approval_event",
      this.callArgs!.args,
      impacted
    );
  }

  _transfer(args: nft.transfer_args): void {
    this.tokenOwners.put(args.token_id!, new common.address(args.to!));

    let key = new Uint8Array(26 + MAX_TOKEN_ID_LENGTH);
    key.set(args.from!, 0);
    key[25] = args.token_id!.length;
    key.set(args.token_id!, 26);
    this.tokenOwnerPairs.remove(key);

    key.set(args.to!, 0);
    this.tokenOwnerPairs.put(key, new common.boole(true));

    let fromBalance = this.balances.get(args.from!)!;
    fromBalance.value -= 1;
    this.balances.put(args.from!, fromBalance);

    let toBalance = this.balances.get(args.to!)!;
    toBalance.value += 1;
    this.balances.put(args.to!, toBalance);

    const impacted = [args.to!, args.from!];
    System.event(
      "collections.transfer_event",
      Protobuf.encode<nft.transfer_args>(args, nft.transfer_args.encode),
      impacted
    );
  }

  _mint(args: nft.mint_args): void {
    System.require(
      args.token_id!.length <= MAX_TOKEN_ID_LENGTH,
      `the max token id length is ${MAX_TOKEN_ID_LENGTH}`
    );
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(!tokenOwner.value, "token already minted");
    this.tokenOwners.put(args.token_id!, new common.address(args.to!));
    const key = new Uint8Array(26 + MAX_TOKEN_ID_LENGTH);
    key.set(args.to!, 0);
    key[25] = args.token_id!.length;
    key.set(args.token_id!, 26);
    this.tokenOwnerPairs.put(key, new common.boole(true));

    const balance = this.balances.get(args.to!)!;
    const supply = this.supply.get()!;
    System.require(
      supply.value <= u64.MAX_VALUE - 1,
      "mint would overflow supply"
    );
    balance.value += 1;
    supply.value += 1;
    this.balances.put(args.to!, balance);
    this.supply.put(supply);

    System.event(
      "collections.mint_event",
      Protobuf.encode<nft.mint_args>(args, nft.mint_args.encode),
      [args.to!]
    );
  }

  _burn(args: nft.burn_args): void {
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(tokenOwner.value, "token does not exist");
    this.tokenOwners.remove(args.token_id!);
    const key = new Uint8Array(26 + MAX_TOKEN_ID_LENGTH);
    key.set(tokenOwner.value!, 0);
    key[25] = args.token_id!.length;
    key.set(args.token_id!, 26);
    this.tokenOwnerPairs.remove(key);

    const balance = this.balances.get(tokenOwner.value!)!;
    const supply = this.supply.get()!;
    balance.value -= 1;
    supply.value -= 1;
    this.balances.put(tokenOwner.value!, balance);
    this.supply.put(supply);

    const impacted = [tokenOwner.value!];
    System.event(
      "collections.burn_event",
      Protobuf.encode<nft.burn_args>(args, nft.burn_args.encode),
      impacted
    );
  }

  /**
   * Transfer ownership of the collection
   * @external
   * @event collections.owner_event common.address
   */
  transfer_ownership(args: common.address): void {
    const isAuthorized = System.checkAccountAuthority(this.owner().value!);
    System.require(isAuthorized, "not authorized by the owner");
    this._transfer_ownership(args);
  }

  /**
   * Set royalties
   * @external
   * @event collections.royalties_event nft.royalties
   */
  set_royalties(args: nft.royalties): void {
    const isAuthorized = System.checkAccountAuthority(this.owner().value!);
    System.require(isAuthorized, "not authorized by the owner");
    this._set_royalties(args);
  }

  /**
   * Set metadata
   * @external
   * @event collections.set_metadata_event nft.metadata_args
   */
  set_metadata(args: nft.metadata_args): void {
    const isAuthorized = System.checkAccountAuthority(this.owner().value!);
    System.require(isAuthorized, "not authorized by the owner");
    this._set_metadata(args);
  }

  /**
   * Grant permissions to other account to manage a specific Token owned
   * by the user. The user must approve only the accounts he trust.
   * @external
   * @event collections.token_approval_event nft.approve_args
   */
  approve(args: nft.approve_args): void {
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(
      Arrays.equal(tokenOwner.value, args.approver_address!),
      "approver is not the owner"
    );

    const isAuthorized = System.checkAccountAuthority(args.approver_address!);
    System.require(isAuthorized, "approval operation not authorized");

    this._approve(args);
  }

  /**
   * Grant permissions to other account to manage all Tokens owned
   * by the user. The user must approve only the accounts he trust.
   * @external
   * @event collections.operator_approval_event nft.set_approval_for_all_args
   */
  set_approval_for_all(args: nft.set_approval_for_all_args): void {
    const isAuthorized = System.checkAccountAuthority(args.approver_address!);
    System.require(
      isAuthorized,
      "set_approval_for_all operation not authorized"
    );
    this._set_approval_for_all(args);
  }

  /**
   * Transfer NFT
   * @external
   * @event collections.transfer_event nft.transfer_args
   */
  transfer(args: nft.transfer_args): void {
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(
      Arrays.equal(tokenOwner.value, args.from!),
      "from is not the owner"
    );

    const isAuthorized = this.check_authority(args.from!, args.token_id!);
    System.require(isAuthorized, "transfer not authorized");

    this._transfer(args);
  }

  /**
   * Mint NFT
   * @external
   * @event collections.mint_event nft.mint_args
   */
  mint(args: nft.mint_args): void {
    const isAuthorized = System.checkAccountAuthority(this.owner().value!);
    System.require(isAuthorized, "not authorized by the owner");
    this._mint(args);
  }
}
