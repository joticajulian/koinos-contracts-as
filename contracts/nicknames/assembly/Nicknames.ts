// SPDX-License-Identifier: MIT
// Nicknames Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { System, Storage, StringBytes } from "@koinos/sdk-as";
import { Nft, System2, nft, common } from "@koinosbox/contracts";
import { nicknames } from "./proto/nicknames";

const TABIS_SPACE_ID = 8;

// same purpose as TOKEN_OWNERS_SPACE_ID (link nfts with owners)
// but forcing a fixed length to be able to order them alphabetically.
// This space doesn't replace TOKEN_OWNERS_SPACE_ID.
const ORDERED_TOKEN_OWNERS_SPACE_ID = 9;

const MAX_TOKEN_ID_LENGTH = 32;

export class Nicknames extends Nft {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "Nicknames";
  _symbol: string = "NICK";

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

  /**
   * Set Text ABI for a token
   * @external
   * @event nicknames.set_tabi nicknames.set_tabi_args
   */
  set_tabi(args: nicknames.set_tabi_args): void {
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    const isAuthorized = System2.check_authority(tokenOwner.account!);
    System.require(isAuthorized, "not authorized by the owner");
    this.tabis.put(args.token_id!, args.tabi!);
    System.event("nicknames.set_tabi", this.callArgs!.args, [
      tokenOwner.account!,
    ]);
  }

  /**
   * Set metadata
   * @external
   */
  set_metadata(args: nft.metadata_args): void {
    const tokenOwner = this.tokenOwners.get(args.token_id!)!;
    const isAuthorized = System2.check_authority(tokenOwner.account!);
    System.require(isAuthorized, "not authorized by the owner");
    this._set_metadata(args);
  }

  levenshtein_distance(str1: string, str2: string): u32 {
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

  verifyValidName(tokenId: Uint8Array): void {
    const name = StringBytes.bytesToString(tokenId);
    System.require(
      name.length >= 5 && name.length <= 32,
      "the name must have between 5 and 32 characters"
    );
    const words = name.split(".");
    for (let i = 0; i < words.length; i += 1) {
      const word = words[i];
      System.require(
        word.length >= 5,
        "dots must divide words of at least 5 characters"
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

    const key = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key.set(tokenId, 0);
    const current = this.orderedTokens.get(key);
    System.require(!current, `'${name}' already exist`);
    const prev = this.orderedTokens.getPrev(key);
    const next = this.orderedTokens.getNext(key);
    if (prev) {
      let i = prev.key!.findIndex((k) => k == 0);
      if (i < 0) i = prev.key!.length;
      const prevName = StringBytes.bytesToString(prev.key!.slice(0, i));
      System.require(
        this.levenshtein_distance(name, prevName) > 3,
        `'${name}' is similar to the existing name '${prevName}'`
      );
    }
    if (next) {
      let i = next.key!.findIndex((k) => k == 0);
      if (i < 0) i = next.key!.length;
      const nextName = StringBytes.bytesToString(next.key!.slice(0, i));
      System.require(
        this.levenshtein_distance(name, nextName) > 3,
        `'${name}' is similar to the existing name '${nextName}'`
      );
    }
  }

  /**
   * Create new name
   * @external
   */
  mint(args: nft.mint_args): void {
    this.verifyValidName(args.token_id!);
    const isAuthorized = System2.check_authority(args.to!);
    System.require(isAuthorized, "not authorized by 'to'");
    const key = new Uint8Array(MAX_TOKEN_ID_LENGTH);
    key.set(args.token_id!, 0);
    this.orderedTokens.put(key, new common.boole(true));
    this._mint(args);
  }
}
