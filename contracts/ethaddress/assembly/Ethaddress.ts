// SPDX-License-Identifier: MIT
// EthAddress Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { System, Base58 } from "@koinos/sdk-as";
import { Nft, nft, System2 } from "@koinosbox/contracts";

export class Ethaddress extends Nft {
  callArgs: System.getArgumentsReturn | null;

  _name: string = "Eth addresses";
  _symbol: string = "ETHADDRESS";
  _uri: string = "";

  /**
   * Register an ethereum address on koinos blockchain
   * @external
   */
  mint(args: nft.mint_args): void {
    const message = `link eth address ${System2.hexString(
      args.token_id!
    )} with koinos ${
      BUILD_FOR_TESTING ? "testnet " : ""
    }address ${Base58.encode(args.to!)}`;
    const authorized = System2.checkMessageSignedByEthAddress(
      message,
      args.token_id!
    );
    if (!authorized) {
      System.fail("not signed by the ethereum address");
    }
    this._mint(args);
  }

  /**
   * Link an ethereum address to a different koinos address
   * @external
   */
  transfer(args: nft.transfer_args): void {
    const message = `change link of eth address ${System2.hexString(
      args.token_id!
    )} to koinos ${BUILD_FOR_TESTING ? "testnet " : ""}address ${Base58.encode(
      args.to!
    )}`;
    const authorized = System2.checkMessageSignedByEthAddress(
      message,
      args.token_id!
    );
    if (!authorized) {
      System.fail("not signed by the ethereum address");
    }
    this._transfer(args);
  }

  /**
   * Deprecated - set metadata
   * @external
   */
  set_metadata(args: nft.metadata_args): void {
    System.fail("set_metadata is deprecated");
  }

  /**
   * Deprecated - approve
   * @external
   */
  approve(args: nft.approve_args): void {
    System.fail("approve is deprecated");
  }

  /**
   * Deprecated - set_approval_for_all
   * @external
   */
  set_approval_for_all(args: nft.set_approval_for_all_args): void {
    System.fail("set_approval_for_all is deprecated");
  }
}
