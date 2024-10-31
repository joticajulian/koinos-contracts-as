import { System, Protobuf, StringBytes } from "@koinos/sdk-as";
import { common, System2 } from "@koinosbox/contracts";

export class KondorElementusNft {
  _contractId: Uint8Array;

  constructor() {
    this._contractId = BUILD_FOR_TESTING
      ? System2.KONDOR_ELEMENTUS_CONTRACT_ID_HARBINGER
      : System2.KONDOR_ELEMENTUS_CONTRACT_ID_MAINNET;
  }

  /**
   * @external
   * @readonly
   */
  can_use_smart_wallet_feature(args: common.address): common.boole {
    const argsBuffer = Protobuf.encode(args, common.address.encode);
    const callRes = System.call(this._contractId, 0xfddada4b, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'KondorElementusNft.can_use_smart_wallet_feature': ${
        callRes.res.error && callRes.res.error!.message
          ? callRes.res.error!.message
          : "unknown error"
      }`;
      System.exit(callRes.code, StringBytes.stringToBytes(errorMessage));
    }
    if (!callRes.res.object) return new common.boole();
    return Protobuf.decode<common.boole>(
      callRes.res.object,
      common.boole.decode
    );
  }
}
