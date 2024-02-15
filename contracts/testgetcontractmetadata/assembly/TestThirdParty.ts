// SPDX-License-Identifier: MIT
// Test contract for third party
// Julian Gonzalez (joticajulian@gmail.com)

import { Protobuf, StringBytes, System, Storage } from "@koinos/sdk-as";
import { common } from "./proto/common";

export class TestThirdParty {
  callArgs: System.getArgumentsReturn | null;

  contractId: Uint8Array = System.getContractId();

  testContractId: Storage.Obj<common.address> = new Storage.Obj(
    this.contractId,
    0,
    common.address.decode,
    common.address.encode
  );

  /**
   * set test contract id
   * @external
   */
  set_test_contract_id(args: common.address): void {
    this.testContractId.put(args);
  }

  /**
   * Operate with the assets of TestContract
   * @external
   */
  operate_external_assets(args: common.address): common.boole {
    const testContractId = this.testContractId.get();
    System.require(testContractId, "testContractId not set");
    const argsBuffer = Protobuf.encode(args, common.address.encode);
    const callRes = System.call(testContractId!.value!, 0x3b2d7fde, argsBuffer);
    if (callRes.code != 0) {
      const errorMessage = `failed to call 'TestContract.operate_assets': ${
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
