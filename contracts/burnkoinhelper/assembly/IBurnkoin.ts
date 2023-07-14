import { System, Protobuf, StringBytes } from "@koinos/sdk-as";
import { burnkoin } from "./proto/burnkoin";

export class Burnkoin {
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

  deposit_vhp(args: burnkoin.burnkoin_args): void {
    const argsBuffer = Protobuf.encode(args, burnkoin.burnkoin_args.encode);
    const callRes = System.call(this._contractId, 0x8ed1d782, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Burnkoin.deposit_vhp': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    return;
  }

  withdraw_koin(args: burnkoin.burnkoin_args): void {
    const argsBuffer = Protobuf.encode(args, burnkoin.burnkoin_args.encode);
    const callRes = System.call(this._contractId, 0xc7c42a57, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'Burnkoin.withdraw_koin': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message!
          : ""
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    return;
  }
}
