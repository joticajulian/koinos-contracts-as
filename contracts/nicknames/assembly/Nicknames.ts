// SPDX-License-Identifier: MIT
// Nicknames Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  StringBytes,
  Arrays,
  Protobuf,
  Base58,
} from "@koinos/sdk-as";
import { Nft, System2, nft, common, INft } from "@koinosbox/contracts";
import { nicknames } from "./proto/nicknames";

System.setSystemBufferSize(524288*2);

// same purpose as TOKEN_OWNERS_SPACE_ID (link nfts with owners)
// but forcing a fixed length to be able to order them alphabetically.
// This space doesn't replace TOKEN_OWNERS_SPACE_ID.
const ORDERED_TOKEN_OWNERS_SPACE_ID = 8;

// same purpose as the previous one but ordering them by
// the second letter
const ORDERED_TOKEN_OWNERS_SPACE_ID_2 = 9;

const TOKEN_SIMILARITY_START_SPACE_ID = 20;

const TABIS_SPACE_ID = 10;

const COMMUNITY_NAMES_SPACE_ID = 11;

const NAMES_IN_DISPUTE_SPACE_ID = 12;

const MAX_TOKEN_ID_LENGTH = 32;

export class Nicknames extends Nft {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "Nicknames";
  _symbol: string = "NICK";
  _uri: string = "https://kondor-nft-api-w6enmqacja-uc.a.run.app/nicknames";

  tabis: Storage.Map<Uint8Array, nicknames.tabi> = new Storage.Map(
    this.contractId,
    TABIS_SPACE_ID,
    nicknames.tabi.decode,
    nicknames.tabi.encode,
    () => new nicknames.tabi()
  );

  /*orderedTokens: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    ORDERED_TOKEN_OWNERS_SPACE_ID,
    common.boole.decode,
    common.boole.encode
  );

  orderedTokens2: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    ORDERED_TOKEN_OWNERS_SPACE_ID_2,
    common.boole.decode,
    common.boole.encode
  );*/

  communityNames: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    COMMUNITY_NAMES_SPACE_ID,
    common.boole.decode,
    common.boole.encode
  );

  namesInDispute: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    NAMES_IN_DISPUTE_SPACE_ID,
    common.boole.decode,
    common.boole.encode
  );

  verifyNotSimilar(
    name: string,
    tokenId: Uint8Array,
    pos: i32
  ): void {
    let similarTokenId = new Uint8Array(tokenId.length - 1);
    similarTokenId.set(tokenId.slice(0, pos), 0);
    if (pos + 1 < tokenId.length) similarTokenId.set(tokenId.slice(pos + 1), pos);

    const tokenSimilarity: Storage.Map<Uint8Array, common.str> = new Storage.Map(
      this.contractId,
      TOKEN_SIMILARITY_START_SPACE_ID + pos,
      common.str.decode,
      common.str.encode
    );
    let s2 = tokenSimilarity.get(similarTokenId);
    if (s2) {
      System.exit(1, StringBytes.stringToBytes(`@${name} is similar to the existing name @${s2!.value!}`));
    }
    if (pos + 1 < tokenId.length) {
      similarTokenId = new Uint8Array(tokenId.length - 2); //System.log("b");
      similarTokenId.set(tokenId.slice(0, pos), 0); //System.log("c");
      if (pos + 2 < tokenId.length) similarTokenId.set(tokenId.slice(pos + 2), pos); //System.log("d");
      s2 = tokenSimilarity.get(similarTokenId); //System.log("e");
      if (s2) {
        System.exit(1, StringBytes.stringToBytes(`@${name} is similar to the existing name @${s2!.value!}`));
      }
    }
  }

  /**
   * Temporary function to reserve the names created
   * in KAP domains.
   * This function will be removed in the future
   */
  verifyNameInKapDomains(name: string, readMode: boolean): void {
    const kap = new INft(Base58.decode("13tmzDmfqCsbYT26C4CmKxq86d33senqH3"));

    // check if the name + ".koin" exists in KAP domains
    // Example: if kap://alice.koin exists then its owner
    //          is the only one that can create @alice
    let kapName = `${name}.koin`;
    let tokenIdKap = StringBytes.stringToBytes(kapName);
    let tokenOwner = kap.owner_of(new nft.token(tokenIdKap));
    if (tokenOwner.account) {
      System.require(
        !readMode && System2.check_authority(tokenOwner.account!),
        `@${name} is reserved for the owner of kap://${kapName}`
      );
    }

    // check if names ending with .koinos exists in KAP domains
    // Example: if kap://alice.koin exists then its owner
    //          is the only one that can create @alice.koinos
    if (!name.endsWith(".koinos")) return;
    kapName = name.slice(0, name.length - 2);
    tokenIdKap = StringBytes.stringToBytes(kapName);
    tokenOwner = kap.owner_of(new nft.token(tokenIdKap));
    if (tokenOwner.account) {
      System.require(
        !readMode && System2.check_authority(tokenOwner.account!),
        `@${name} is reserved for the owner of kap://${kapName}`
      );
    }
  }

  verifyValidName(tokenId: Uint8Array, readMode: boolean): void {
    const name = StringBytes.bytesToString(tokenId);
    System.require(
      name.length >= 3 && name.length <= 32,
      "the name must have between 3 and 32 characters"
    );

    // do not accept names ending with .koin to avoid
    // confussions with the names used in the principal domain
    // of KAP Domains (.koin)
    System.require(!name.endsWith(".koin"), "the name cannot end with .koin");

    const words = name.split(".");
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      System.require(
        word.length >= 3,
        "dots must divide words of at least 3 characters"
      );

      System.require(!word.includes("--"), "invalid segment '--'");

      for (let j = 0; j < word.length; j += 1) {
        const charCode = word.charCodeAt(j);
        if (j == 0) {
          System.require(
            charCode >= 97 && charCode <= 122, // is a lowercase letter (a-z)
            "words must start with a lowercase letter"
          );
        } else if (j == word.length - 1) {
          System.require(
            (charCode >= 97 && charCode <= 122) || // is a lowercase letter (a-z), or
              (charCode >= 48 && charCode <= 57), // is a number (0-9), or
            "words must end with lowercase letters or numbers"
          );
        } else {
          System.require(
            (charCode >= 97 && charCode <= 122) || // is a lowercase letter (a-z), or
              (charCode >= 48 && charCode <= 57) || // is a number (0-9), or
              charCode == 45, // is a hyphen "-"
            "words must contain only lowercase letters, numbers, dots, or hyphens"
          );
        }
      }
    }
    const s = this.tokenOwners.get(tokenId)!;
    System.require(!s.account, `@${name} already exists`);
    for (let i = 0; i < tokenId.length; i += 1) {
      this.verifyNotSimilar(name, tokenId, i);
    }

    // this.verifyNameInKapDomains(name, readMode);*/
  }

  /**
   * Verify if a new name is valid
   * @external
   * @readonly
   */
  verify_valid_name(args: common.str): common.str {
    const tokenId = StringBytes.stringToBytes(args.value!);
    this.verifyValidName(tokenId, true);
    return new common.str(`@${args.value!} is available`);
  }

  /**
   * Create new name
   * @external
   * @event collections.mint_event nft.mint_args
   */
  mint(args: nft.mint_args): void {//System.log("minting");
    this.verifyValidName(args.token_id!, false);
    const isAuthorized = System2.check_authority(args.to!);
    System.require(isAuthorized, "not authorized by 'to'");
    
    const name = StringBytes.bytesToString(args.token_id!);
    let similarTokenId = new Uint8Array(args.token_id!.length - 1);
    for (let i = 0; i < args.token_id!.length; i += 1) {
      similarTokenId.set(args.token_id!.slice(0, i), 0);
      if (i + 1 < args.token_id!.length) {
        similarTokenId.set(args.token_id!.slice(i + 1), i);
      }

      const tokenSimilarity: Storage.Map<Uint8Array, common.str> = new Storage.Map(
        this.contractId,
        TOKEN_SIMILARITY_START_SPACE_ID + i,
        common.str.decode,
        common.str.encode
      );
      tokenSimilarity.put(similarTokenId, new common.str(name));
    }

    // mint the token
    this._mint(args);
  }

  /**
   * Delete a name
   * @external
   * @event collections.burn_event nft.burn_args
   */
  burn(args: nft.burn_args): void {
    // check if it's a name in dispute
    const nameInDispute = this.namesInDispute.get(args.token_id!);
    System.require(!nameInDispute, "name in dispute");

    const isCommunityName = this.communityNames.get(args.token_id!);
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() ||
          System2.check_authority(this.contractId),
        "burn not authorized by the community"
      );
    } else {
      const tokenOwner = this.tokenOwners.get(args.token_id!)!;
      System.require(tokenOwner.account, "token does not exist");
      const isAuthorized = System2.check_authority(tokenOwner.account!);
      System.require(isAuthorized, "burn not authorized");
    }

    let similarTokenId = new Uint8Array(args.token_id!.length - 1);
    for (let i = 0; i < args.token_id!.length; i += 1) {
      similarTokenId.set(args.token_id!.slice(0, i), 0);
      if (i + 1 < args.token_id!.length) {
        similarTokenId.set(args.token_id!.slice(i + 1), i);
      }
      const tokenSimilarity: Storage.Map<Uint8Array, common.str> = new Storage.Map(
        this.contractId,
        TOKEN_SIMILARITY_START_SPACE_ID + i,
        common.str.decode,
        common.str.encode
      );
      tokenSimilarity.remove(similarTokenId);
    }

    // burn the token
    this._burn(args);
  }

  /**
   * Transfer Name
   * @external
   * @event collections.transfer_event nft.transfer_args
   */
  transfer(args: nft.transfer_args): void {
    // check if it's a name in dispute
    const nameInDispute = this.namesInDispute.get(args.token_id!);
    System.require(!nameInDispute, "name in dispute");

    const isCommunityName = this.communityNames.get(args.token_id!);
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() ||
          System2.check_authority(this.contractId),
        "transfer not authorized by the community"
      );
    } else {
      const tokenOwner = this.tokenOwners.get(args.token_id!)!;
      System.require(
        Arrays.equal(tokenOwner.account, args.from!),
        "from is not the owner"
      );

      const isAuthorized = this.check_authority(args.from!, args.token_id!);
      System.require(isAuthorized, "transfer not authorized");
    }

    this._transfer(args);

    // remove it from community names if that is the case.
    // For instance, when the community transfer a community
    // token to a particular user.
    this.communityNames.remove(args.token_id!);
  }

  /**
   * Transfer name to another address and define that the
   * name will be controlled by the community
   * @external
   * @event collections.transfer_event nft.transfer_args
   * @event collections.transferred_to_community nft.transfer_args
   */
  transfer_to_community(args: nft.transfer_args): void {
    // transfer the token
    this.transfer(args);

    // set the token as a community name
    this.communityNames.put(args.token_id!, new common.boole(true));
    const impacted = [args.to!, args.from!];
    System.event(
      "collections.transferred_to_community",
      Protobuf.encode<nft.transfer_args>(args, nft.transfer_args.encode),
      impacted
    );
  }

  /**
   * Set Text ABI for a token
   * @external
   * @event nicknames.set_tabi nicknames.set_tabi_args
   */
  set_tabi(args: nicknames.set_tabi_args): void {
    const isCommunityName = this.communityNames.get(args.token_id!);
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(tokenOwner.account, "token does not exist");
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() ||
          System2.check_authority(this.contractId),
        "not authorized by the community"
      );
    } else {
      const isAuthorized = System2.check_authority(tokenOwner.account!);
      System.require(isAuthorized, "not authorized by the owner");
    }

    this.tabis.put(args.token_id!, args.tabi!);
    System.event("nicknames.set_tabi", this.callArgs!.args, [
      tokenOwner.account!,
    ]);
  }

  /**
   * Set metadata
   * @external
   * @event collections.set_metadata_event nft.metadata_args
   */
  set_metadata(args: nft.metadata_args): void {
    const isCommunityName = this.communityNames.get(args.token_id!);
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(tokenOwner.account, "token does not exist");
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() ||
          System2.check_authority(this.contractId),
        "not authorized by the community"
      );
    } else {
      const isAuthorized = System2.check_authority(tokenOwner.account!);
      System.require(isAuthorized, "not authorized by the owner");
    }

    this._set_metadata(args);
  }

  /**
   * Set name in dispute
   * @external
   */
  set_name_in_dispute(args: nft.token): void {
    // TODO: use only gov system after the grace period
    System.require(
      System.checkSystemAuthority() || System2.check_authority(this.contractId),
      "not authorized by the community"
    );
    this.namesInDispute.put(args.token_id!, new common.boole(true));
  }
}
