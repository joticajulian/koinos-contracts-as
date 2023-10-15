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

System.setSystemBufferSize(524288);

// same purpose as TOKEN_OWNERS_SPACE_ID (link nfts with owners)
// but forcing a fixed length to be able to order them alphabetically.
// This space doesn't replace TOKEN_OWNERS_SPACE_ID.
const ORDERED_TOKEN_OWNERS_SPACE_ID = 8;

// same purpose as the previous one but ordering them by
// the second letter
const ORDERED_TOKEN_OWNERS_SPACE_ID_2 = 9;

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

  orderedTokens: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
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
  );

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

  levenshteinDistance(str1: string, str2: string): u32 {
    const track = new Array<Array<u32>>(str2.length + 1);
    for (let j = 0; j <= str2.length; j += 1) {
      track[j] = new Array<u32>(str1.length + 1);
      if (j === 0) {
        for (let i = 0; i <= str1.length; i += 1) {
          track[0][i] = i;
        }
      }
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] == str2[j - 1] ? 0 : 1;
        const deletion = track[j][i - 1] + 1;
        const insertion = track[j - 1][i] + 1;
        const substitution = track[j - 1][i - 1] + indicator;

        // calculate the minimum between deletion, insertion, and subtitution
        let min = deletion < insertion ? deletion : insertion;
        track[j][i] = min < substitution ? min : substitution;
      }
    }
    return track[str2.length][str1.length];
  }

  verifyNotSimilar(
    name: string,
    nearObj: System.ProtoDatabaseObject<common.boole> | null,
    firstUnknown: boolean = false
  ): void {
    if (!nearObj) return;
    let i = nearObj.key!.findIndex((k) => k == 0);
    if (i < 0) i = nearObj.key!.length;
    const nearName = StringBytes.bytesToString(nearObj.key!.slice(0, i));
    System.require(
      this.levenshteinDistance(name, nearName) >= 3,
      `@${name} is similar to the existing name @${
        firstUnknown ? "?" : ""
      }${nearName}`
    );
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

    // Following we make 4 verifications:
    // 1- try to fit the new name in the list of names
    // 2- try to fit the new name in the list of names ordered by the second letter
    // 3- try to fit the new name less first letter in the list of names
    // 4- try to fit the new name less first letter in the list of names ordered by the second letter
    //
    // Example:
    //   The names are: [absorb, carlos1234, julian, outside, pumpkin, review]
    //   The new name is "fumpkin"
    //
    // 1- try to fit the new name in the list of names
    // absorb
    // carlos1234
    //   fumpkin <-- OK
    // julian
    // outside
    // pumpkin
    // review
    //
    // 2- try to fit the new name in the list of names ordered by the second letter
    // ?arlos1234
    // ?bsorb
    // ?eview
    //   fumpkin <-- OK
    // ?ulian
    // ?umpkin
    // ?utside
    //
    // 3- try to fit the new name less first letter in the list of names
    // absorb
    // carlos1234
    // julian
    // outside
    // pumpkin
    // review
    //   umpkin <-- OK
    //
    // 4- try to fit the new name less first letter in the list of names ordered by the second letter
    // ?arlos1234
    // ?bsorb
    // ?eview
    // ?ulian
    // ?umpkin
    //   umpkin <-- FAIL
    // ?utside

    // key id for the new name
    const key = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key.set(tokenId, 0);

    // key id for the new name less first letter
    const key2 = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key2.set(tokenId.slice(1), 0);

    // 1- try to fit the new name in the list of names
    let sameName = this.orderedTokens.get(key);
    System.require(!sameName, `@${name} already exist`);
    this.verifyNotSimilar(name, this.orderedTokens.getPrev(key));
    this.verifyNotSimilar(name, this.orderedTokens.getNext(key));

    // 2- try to fit the new name in the list of names ordered by the second letter
    sameName = this.orderedTokens2.get(key);
    System.require(
      !sameName,
      `@${name} is similar to the existing name @?${name}`
    );
    this.verifyNotSimilar(name, this.orderedTokens2.getPrev(key), true);
    this.verifyNotSimilar(name, this.orderedTokens2.getNext(key), true);

    // 3- try to fit the new name less first letter in the list of names
    sameName = this.orderedTokens.get(key2);
    System.require(
      !sameName,
      `@${name} is similar to the existing name @${name.slice(1)}`
    );
    this.verifyNotSimilar(name, this.orderedTokens.getPrev(key2));
    this.verifyNotSimilar(name, this.orderedTokens.getNext(key2));

    // 4- try to fit the new name less first letter in the list of names ordered by the second letter
    sameName = this.orderedTokens2.get(key2);
    System.require(
      !sameName,
      `@${name} is similar to the existing name @?${name.slice(1)}`
    );
    this.verifyNotSimilar(name, this.orderedTokens2.getPrev(key2), true);
    this.verifyNotSimilar(name, this.orderedTokens2.getNext(key2), true);

    // this.verifyNameInKapDomains(name, readMode);
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
  mint(args: nft.mint_args): void {
    this.verifyValidName(args.token_id!, false);
    const isAuthorized = System2.check_authority(args.to!);
    System.require(isAuthorized, "not authorized by 'to'");

    // save it in the space that orders them alphabetically
    const key = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key.set(args.token_id!, 0);
    this.orderedTokens.put(key, new common.boole(true));

    // save it in the space that orders them alphabetically by the second letter
    const key2 = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key2.set(args.token_id!.slice(1), 0);
    this.orderedTokens2.put(key2, new common.boole(true));

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

    // remove it from the space that orders them alphabetically
    const key = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key.set(args.token_id!, 0);
    this.orderedTokens.remove(key);

    // remove it from the space that orders them alphabetically by the second letter
    const key2 = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key2.set(args.token_id!.slice(1), 0);
    this.orderedTokens2.remove(key2);

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
