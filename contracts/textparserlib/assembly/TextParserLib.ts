// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { textparserlib } from "./proto/textparserlib";

export const enum typeNumber {
  u64 = 0,
  u32 = 1,
  i64 = 2,
  i32 = 3,
};

export class TextParserLib {
  callArgs: System.getArgumentsReturn | null;

  isAnInteger(value: string): boolean {
    if (!value) return true;
    for (let i = 0; i < value.length; i += 1) {
      const code = value.charCodeAt(i);
      if (code < 48 || code > 57) return false;
    }
    return true;
  }

  parseNumberWithDecimals(value: string, decimals: i32, type: typeNumber): textparserlib.result {
    let sign = "";
    let val = value;
    if (val.startsWith("-")) {
      if (type == typeNumber.u64 || type == typeNumber.u32) {
        return new textparserlib.result(`${value} must be positive`);
      }
      sign = "-";
      val = val.slice(1);
    }
    const parts = val.split(".");
    if (parts.length == 0 || parts.length > 2) {
      return new textparserlib.result(`invalid number ${value}`);
    }
    let integerPart = parts[0];
    let decimalPart = "";
    if (parts.length == 2) {
      if (parts[1].length == 0) {
        return new textparserlib.result(`invalid number ${value}`);
      }
      decimalPart = parts[1];
    }
    if (!this.isAnInteger(integerPart) || !this.isAnInteger(decimalPart)) {
      return new textparserlib.result(`${value} is not a number`);
    }
    decimalPart = decimalPart.padEnd(decimals, "0");
    if (decimalPart.length !== decimals || 
        integerPart.length == 0 || 
        (integerPart.length > 1 && integerPart.startsWith("0"))
    ) {
      return new textparserlib.result(`invalid number ${value}`);
    }
    const numberString = `${sign}${integerPart}${decimalPart}`;
    switch(type) {
      case typeNumber.u64: {
        const num = U64.parseInt(numberString);
        return new textparserlib.result(null, null, num);
      }
      case typeNumber.u32: {
        const num = U32.parseInt(numberString);
        return new textparserlib.result(null, null, 0, num);
      }
      case typeNumber.i64: {
        const num = I64.parseInt(numberString);
        return new textparserlib.result(null, null, 0, 0, num);
      }
      case typeNumber.i32: {
        const num = I32.parseInt(numberString);
        return new textparserlib.result(null, null, 0, 0, 0, num);
      }
      default:
        return new textparserlib.result("internal error");
    }
  }
}
