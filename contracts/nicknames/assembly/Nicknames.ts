// SPDX-License-Identifier: MIT
// Nicknames Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { System, Storage } from "@koinos/sdk-as";
import { Nft, System2, nft } from "@koinosbox/contracts";
import { nicknames } from "./proto/nicknames";

const TABIS_SPACE_ID = 8;

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
    System.event("nicknames.set_tabi", this.callArgs!.args, [tokenOwner.account!]);
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
}
