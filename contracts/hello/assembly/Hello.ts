// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { hello } from "./proto/hello";

export class Hello {
  callArgs: System.getArgumentsReturn | null;

  /**
   * Hello world function
   * @external
   * @readonly
   */
  say_hello(): hello.str {
    return new hello.str("Hello World 🚀");
  }
}
