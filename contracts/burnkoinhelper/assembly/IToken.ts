// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { System, Protobuf, StringBytes } from "@koinos/sdk-as";
import { token } from "./proto/token";

export class Token {
  _contractId: Uint8Array;

  /**
   * Create an instance of a Token contract
   * @example
   * ```ts
   *   const contract = new Token(Base58.decode("1DQzuCcTKacbs9GGScFTU1Hc8BsyARTPqe"));
   * ```
   */
  constructor(contractId: Uint8Array) {
    this._contractId = contractId;
  }

  /**
   * Get name of the token
   * @external
   * @readonly
   */
  name(): token.str {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0x82a3537f, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.name': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.str();
    return Protobuf.decode<token.str>(callRes.res.object!, token.str.decode);
  }

  /**
   * Get the symbol of the token
   * @external
   * @readonly
   */
  symbol(): token.str {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xb76a7ca1, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.symbol': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.str();
    return Protobuf.decode<token.str>(callRes.res.object!, token.str.decode);
  }

  /**
   * Get the decimals of the token
   * @external
   * @readonly
   */
  decimals(): token.uint32 {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xee80fd2f, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.decimals': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.uint32();
    return Protobuf.decode<token.uint32>(
      callRes.res.object!,
      token.uint32.decode
    );
  }

  /**
   * Get name, symbol and decimals
   * @external
   * @readonly
   */
  get_info(): token.info {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xbd7f6850, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.get_info': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.info();
    return Protobuf.decode<token.info>(callRes.res.object!, token.info.decode);
  }

  /**
   * Get total supply
   * @external
   * @readonly
   */
  total_supply(): token.uint64 {
    const argsBuffer = new Uint8Array(0);
    const callRes = System.call(this._contractId, 0xb0da3934, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.total_supply': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.uint64();
    return Protobuf.decode<token.uint64>(
      callRes.res.object!,
      token.uint64.decode
    );
  }

  /**
   * Get balance of an account
   * @external
   * @readonly
   */
  balance_of(args: token.balance_of_args): token.uint64 {
    const argsBuffer = Protobuf.encode(args, token.balance_of_args.encode);
    const callRes = System.call(this._contractId, 0x5c721497, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.balance_of': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.uint64();
    return Protobuf.decode<token.uint64>(
      callRes.res.object!,
      token.uint64.decode
    );
  }

  /**
   * Get allowance
   * @external
   * @readonly
   */
  allowance(args: token.allowance_args): token.uint64 {
    const argsBuffer = Protobuf.encode(args, token.allowance_args.encode);
    const callRes = System.call(this._contractId, 0x32f09fa1, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.allowance': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new token.uint64();
    return Protobuf.decode<token.uint64>(
      callRes.res.object!,
      token.uint64.decode
    );
  }

  /**
   * Grant permissions to other account to manage the tokens owned
   * by the user. The user must approve only the accounts he trust.
   * @external
   */
  approve(args: token.approve_args): void {
    const argsBuffer = Protobuf.encode(args, token.approve_args.encode);
    const callRes = System.call(this._contractId, 0x74e21680, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.approve': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    return;
  }

  /**
   * Transfer tokens
   * @external
   */
  transfer(args: token.transfer_args): void {
    const argsBuffer = Protobuf.encode(args, token.transfer_args.encode);
    const callRes = System.call(this._contractId, 0x27f576ca, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.transfer': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    return;
  }

  /**
   * Mint new tokens
   * @external
   */
  mint(args: token.mint_args): void {
    const argsBuffer = Protobuf.encode(args, token.mint_args.encode);
    const callRes = System.call(this._contractId, 0xdc6f17bb, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Token.mint': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    return;
  }
}
