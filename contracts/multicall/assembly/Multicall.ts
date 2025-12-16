// SPDX-License-Identifier: MIT
// Burnkoin Helper Contract {{ version }}
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { multicall } from "./proto/multicall";

System.setSystemBufferSize(524288);

export class Multicall {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Get the result of a multicall
   * @external
   * @readonly
   */
  get(args: multicall.get_args): multicall.get_return {
    const calls = args.calls;
    const results = new Array<multicall.call_return>(calls.length);
    for (let i = 0; i < calls.length; i += 1) {
      const call = calls[i];
      const result = System.call(call.contract_id!, call.entry_point, call.args!);
      results[i] = new multicall.call_return(
        result.code,
        new multicall.result(
          result.res.object,
          result.res.error ? new multicall.error_data(result.res.error!.message) : null
        )
      );
    }
    return new multicall.get_return(results);
  }
}
