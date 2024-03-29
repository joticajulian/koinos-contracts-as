// SPDX-License-Identifier: MIT
// Nicknames Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import {
  System,
  Storage,
  StringBytes,
  Arrays,
  Protobuf,
  authority,
} from "@koinos/sdk-as";
import { Nft, System2, nft, common } from "@koinosbox/contracts";
import { nicknames } from "./proto/nicknames";

System.setSystemBufferSize(524288);

const TABIS_SPACE_ID = 10;

const COMMUNITY_NAMES_SPACE_ID = 11;

// const NAMES_IN_DISPUTE_SPACE_ID = 12;

const MAIN_TOKEN_SPACE_ID = 13;

/**
 * List of spaces going from ID=19 to ID=51
 * Each space is used to store a patterns for names
 * in order to identify similarities
 */
const TOKEN_SIMILARITY_START_SPACE_ID = 20;

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

  communityNames: Storage.Map<Uint8Array, common.boole> = new Storage.Map(
    this.contractId,
    COMMUNITY_NAMES_SPACE_ID,
    common.boole.decode,
    common.boole.encode
  );

  mainToken: Storage.Map<Uint8Array, nft.token> = new Storage.Map(
    this.contractId,
    MAIN_TOKEN_SPACE_ID,
    nft.token.decode,
    nft.token.encode
  );

  verifyNotSimilar(name: string, tokenId: Uint8Array): void {
    /**
     * When the name @alice is created, the contract creates a list
     * of patters that are saved in the database in order to detect
     * similar names in the future.
     *
     * SPACE_ID       PATTERN       SIMILAR NAME
     * 19              lice         alice
     * 19             a ice         alice
     * 19             al ce         alice
     * 19             ali e         alice
     * 19             alic          alice
     *
     * 20              lice         alice
     *
     * 21             a ice         alice
     *
     * 22             al ce         alice
     *
     * 23             ali e         alice
     *
     * 24             alic          alice
     *
     * Let' say someone tries to register the name @alicia
     *
     * - @alicia cannot exist in the space 19 --> OK
     *
     * Then, some patters are created and checked against the
     * other spaces.
     *
     * Removing 1 letter:
     * - @ licia cannot exist in the space 20 --> OK
     * - @a icia cannot exist in the space 21 --> OK
     * - @al cia cannot exist in the space 22 --> OK
     * - @ali ia cannot exist in the space 23 --> OK
     * - @alic a cannot exist in the space 24 --> OK
     * - @alici  cannot exist in the space 25 --> OK
     *
     * Removing 2 letters:
     * - @  icia cannot exist in the space 20 --> OK
     * - @a  cia cannot exist in the space 21 --> OK
     * - @al  ia cannot exist in the space 22 --> OK
     * - @ali  a cannot exist in the space 23 --> OK
     * - @alic   cannot exist in the space 24 --> FAIL !!
     *
     * @alicia cannot be created because it's similar to @alice
     */

    const tokenSimilarityBase: Storage.Map<Uint8Array, common.str> =
      new Storage.Map(
        this.contractId,
        TOKEN_SIMILARITY_START_SPACE_ID - 1,
        common.str.decode,
        common.str.encode
      );
    let similarName = tokenSimilarityBase.get(tokenId);
    if (similarName) {
      System.exit(
        1,
        StringBytes.stringToBytes(
          `@${name} is similar to the existing name @${similarName.value!}`
        )
      );
    }

    let similarTokenId: Uint8Array;

    for (let i = 0; i < tokenId.length; i += 1) {
      const tokenSimilarity: Storage.Map<Uint8Array, common.str> =
        new Storage.Map(
          this.contractId,
          TOKEN_SIMILARITY_START_SPACE_ID + i,
          common.str.decode,
          common.str.encode
        );

      // remove 1 letter from tokenId
      similarTokenId = new Uint8Array(tokenId.length - 1);
      similarTokenId.set(tokenId.slice(0, i), 0);
      if (i + 1 < tokenId.length) {
        similarTokenId.set(tokenId.slice(i + 1), i);
      }

      // check if there is a similar name
      similarName = tokenSimilarity.get(similarTokenId);
      if (similarName) {
        System.exit(
          1,
          StringBytes.stringToBytes(
            `@${name} is similar to the existing name @${similarName.value!}`
          )
        );
      }

      if (i + 1 < tokenId.length) {
        // remove 2 letters from tokenId
        similarTokenId = new Uint8Array(tokenId.length - 2);
        similarTokenId.set(tokenId.slice(0, i), 0);
        if (i + 2 < tokenId.length) {
          similarTokenId.set(tokenId.slice(i + 2), i);
        }

        // check if there is a similar name
        similarName = tokenSimilarity.get(similarTokenId);
        if (similarName) {
          System.exit(
            1,
            StringBytes.stringToBytes(
              `@${name} is similar to the existing name @${similarName.value!}`
            )
          );
        }
      }
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

    // verify naming rules
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

    // verify it is a new name
    const s = this.tokenOwners.get(tokenId)!;
    System.require(!s.value, `@${name} already exists`);

    // verify it is not similar to existing names
    this.verifyNotSimilar(name, tokenId);
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
   * Get community tokens
   * @external
   * @readonly
   */
  get_community_tokens(args: nft.get_tokens_args): nft.token_ids {
    const direction = args.descending
      ? Storage.Direction.Descending
      : Storage.Direction.Ascending;
    const tokenIds = this.communityNames.getManyKeys(
      args.start ? args.start! : new Uint8Array(0),
      args.limit,
      direction
    );
    return new nft.token_ids(tokenIds);
  }

  /**
   * Get TABI
   * @external
   * @readonly
   */
  get_tabi(args: nft.token): nicknames.tabi {
    return this.tabis.get(args.token_id!)!;
  }

  /**
   * Get main token of an account
   * @external
   * @readonly
   */
  get_main_token(args: common.address): nft.token {
    const mainToken = this.mainToken.get(args.value!);
    if (!mainToken) return new nft.token();
    return mainToken;
  }

  /**
   * Create new name
   * @external
   * @event collections.mint_event nft.mint_args
   */
  mint(args: nft.mint_args): void {
    const isAuthorized = System.checkAuthority(
      authority.authorization_type.contract_call,
      args.to!
    );
    System.require(isAuthorized, "not authorized by 'to'");

    this.verifyValidName(args.token_id!, false);

    // add patterns for similar names
    const tokenSimilarityBase: Storage.Map<Uint8Array, common.str> =
      new Storage.Map(
        this.contractId,
        TOKEN_SIMILARITY_START_SPACE_ID - 1,
        common.str.decode,
        common.str.encode
      );

    let similarTokenId = new Uint8Array(args.token_id!.length - 1);
    const name = StringBytes.bytesToString(args.token_id!);
    const similarName = new common.str(name);
    for (let i = 0; i < args.token_id!.length; i += 1) {
      const tokenSimilarity: Storage.Map<Uint8Array, common.str> =
        new Storage.Map(
          this.contractId,
          TOKEN_SIMILARITY_START_SPACE_ID + i,
          common.str.decode,
          common.str.encode
        );

      // remove 1 letter from tokenId
      // (see comments in verifyNotSimilar function)
      similarTokenId.set(args.token_id!.slice(0, i), 0);
      if (i + 1 < args.token_id!.length) {
        similarTokenId.set(args.token_id!.slice(i + 1), i);
      }

      tokenSimilarityBase.put(similarTokenId, similarName);
      tokenSimilarity.put(similarTokenId, similarName);
    }

    // set main token
    const mainToken = this.mainToken.get(args.to!);
    if (!mainToken) {
      this.mainToken.put(args.to!, new nft.token(args.token_id!));
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
    const isCommunityName = this.communityNames.get(args.token_id!);
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() || System2.isSignedBy(this.contractId),
        "burn not authorized by the community"
      );
    } else {
      System.require(tokenOwner.value, "token does not exist");
      const isAuthorized = System.checkAuthority(
        authority.authorization_type.contract_call,
        tokenOwner.value!
      );
      System.require(isAuthorized, "burn not authorized");
    }

    // remove patterns for similar names
    const tokenSimilarityBase: Storage.Map<Uint8Array, common.str> =
      new Storage.Map(
        this.contractId,
        TOKEN_SIMILARITY_START_SPACE_ID - 1,
        common.str.decode,
        common.str.encode
      );

    let similarTokenId = new Uint8Array(args.token_id!.length - 1);
    for (let i = 0; i < args.token_id!.length; i += 1) {
      const tokenSimilarity: Storage.Map<Uint8Array, common.str> =
        new Storage.Map(
          this.contractId,
          TOKEN_SIMILARITY_START_SPACE_ID + i,
          common.str.decode,
          common.str.encode
        );

      // remove 1 letter from tokenId
      // (see comments in verifyNotSimilar function)
      similarTokenId.set(args.token_id!.slice(0, i), 0);
      if (i + 1 < args.token_id!.length) {
        similarTokenId.set(args.token_id!.slice(i + 1), i);
      }

      tokenSimilarityBase.remove(similarTokenId);
      tokenSimilarity.remove(similarTokenId);
    }

    // burn the token
    this._burn(args);

    // update main token
    const mainToken = this.mainToken.get(tokenOwner.value!);
    if (mainToken && Arrays.equal(mainToken.token_id!, args.token_id!)) {
      const tokens = this.get_tokens_by_owner(
        new nft.get_tokens_by_owner_args(
          tokenOwner.value!,
          new Uint8Array(0),
          1
        )
      );
      if (tokens.token_ids.length > 0) {
        this.mainToken.put(
          tokenOwner.value!,
          new nft.token(tokens.token_ids[0])
        );
      } else {
        this.mainToken.remove(tokenOwner.value!);
      }
    }
  }

  /**
   * Transfer Name
   * @external
   * @event collections.transfer_event nft.transfer_args
   */
  transfer(args: nft.transfer_args): void {
    const isCommunityName = this.communityNames.get(args.token_id!);
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() || System2.isSignedBy(this.contractId),
        "transfer not authorized by the community"
      );
    } else {
      const tokenOwner = this.tokenOwners.get(args.token_id!)!;
      System.require(
        Arrays.equal(tokenOwner.value, args.from!),
        "from is not the owner"
      );

      const isAuthorized = this.check_authority(args.from!, args.token_id!);
      System.require(isAuthorized, "transfer not authorized");
    }

    this._transfer(args);

    // set main token
    const mainToken = this.mainToken.get(args.to!);
    if (!mainToken) {
      this.mainToken.put(args.to!, new nft.token(args.token_id!));
    }

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
    System.require(tokenOwner.value, "token does not exist");
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() || System2.isSignedBy(this.contractId),
        "not authorized by the community"
      );
    } else {
      const isAuthorized = System.checkAuthority(
        authority.authorization_type.contract_call,
        tokenOwner.value!
      );
      System.require(isAuthorized, "not authorized by the owner");
    }

    this.tabis.put(args.token_id!, args.tabi!);
    System.event("nicknames.set_tabi", this.callArgs!.args, [
      tokenOwner.value!,
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
    System.require(tokenOwner.value, "token does not exist");

    if (System2.isSignedBy(this.contractId)) {
      // TODO: temporal if while a new set_metadata management
      // is implemented
    } else {
      if (isCommunityName) {
        // TODO: use only gov system after the grace period
        System.require(
          System.checkSystemAuthority() || System2.isSignedBy(this.contractId),
          "not authorized by the community"
        );
      } else {
        const isAuthorized = System.checkAuthority(
          authority.authorization_type.contract_call,
          tokenOwner.value!
        );
        System.require(isAuthorized, "not authorized by the owner");
      }
    }

    this._set_metadata(args);
  }

  /**
   * Set main token
   * @external
   *
   */
  set_main_token(args: nft.token): void {
    const isCommunityName = this.communityNames.get(args.token_id!);
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    System.require(tokenOwner.value, "token does not exist");
    if (isCommunityName) {
      // TODO: use only gov system after the grace period
      System.require(
        System.checkSystemAuthority() || System2.isSignedBy(this.contractId),
        "not authorized by the community"
      );
    } else {
      const isAuthorized = System.checkAuthority(
        authority.authorization_type.contract_call,
        tokenOwner.value!
      );
      System.require(isAuthorized, "not authorized by the owner");
    }

    const mainToken = this.mainToken.get(tokenOwner.value!);
    if (mainToken) {
      const mainTokenIsCommunityName = this.communityNames.get(
        mainToken.token_id!
      );
      if (mainTokenIsCommunityName) {
        System.require(
          isCommunityName,
          `the main token for this account is @${StringBytes.bytesToString(
            mainToken.token_id!
          )}, which is governed by the community`
        );
      }
    }

    this.mainToken.put(tokenOwner.value!, args);
  }
}
