// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { System } from "@koinos/sdk-as";
import { textparserlib } from "./proto/textparserlib";

export const enum typeData {
  bool = 2,
  string = 3,
  bytes = 4,
  uint64 = 5,
  uint32 = 6,
  int64 = 7,
  int32 = 8,
  nested = 9,
  repeated = 10,
}

class resultWords {
  error: string | null;

  words: string[] | null;

  constructor(error: string | null = null, words: string[] | null = []) {
    this.error = error;
    this.words = words;
  }
}

class resultNumber {
  error: string | null;

  uint64: u64 | null;

  uint32: u32 | null;

  int64: i64 | null;

  int32: i32 | null;

  constructor(
    error: string | null = null,
    uint64: u64 | null = 0,
    uint32: u32 | null = 0,
    int64: i64 | null = 0,
    int32: i32 | null = 0
  ) {
    this.error = error;
    this.uint64 = uint64;
    this.uint32 = uint32;
    this.int64 = int64;
    this.int32 = int32;
  }
}

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

  parseNumberWithDecimals(
    value: string,
    decimals: i32,
    type: typeData
  ): resultNumber {
    let sign = "";
    let val = value;
    if (val.startsWith("-")) {
      if (type == typeData.uint64 || type == typeData.uint32) {
        return new resultNumber(`${value} must be positive`);
      }
      sign = "-";
      val = val.slice(1);
    }
    const parts = val.split(".");
    if (parts.length == 0 || parts.length > 2) {
      return new resultNumber(`invalid number ${value}`);
    }
    let integerPart = parts[0];
    let decimalPart = "";
    if (parts.length == 2) {
      if (parts[1].length == 0) {
        return new resultNumber(`invalid number ${value}`);
      }
      decimalPart = parts[1];
    }
    if (!this.isAnInteger(integerPart) || !this.isAnInteger(decimalPart)) {
      return new resultNumber(`${value} is not a number`);
    }
    decimalPart = decimalPart.padEnd(decimals, "0");
    if (
      decimalPart.length !== decimals ||
      integerPart.length == 0 ||
      (integerPart.length > 1 && integerPart.startsWith("0"))
    ) {
      return new resultNumber(`invalid number ${value}`);
    }
    const numberString = `${sign}${integerPart}${decimalPart}`;
    switch (type) {
      case typeData.uint64: {
        const num = U64.parseInt(numberString);
        return new resultNumber(null, num);
      }
      case typeData.uint32: {
        const num = U32.parseInt(numberString);
        return new resultNumber(null, 0, num);
      }
      case typeData.int64: {
        const num = I64.parseInt(numberString);
        return new resultNumber(null, 0, 0, num);
      }
      case typeData.int32: {
        const num = I32.parseInt(numberString);
        return new resultNumber(null, 0, 0, 0, num);
      }
      default:
        return new resultNumber("internal error");
    }
  }

  splitPhrase(textInput: string, groupArrays = true): resultWords {
    const words = textInput.split(" ");
    let i = 0;
    let bracketsInConstruction = 0;
    let arrayInConstruction = false;
    let stringInConstruction = false;
    while (i < words.length) {
      const word = words[i];

      if (!groupArrays && bracketsInConstruction === 0) {
        arrayInConstruction = false;
      }

      if (
        arrayInConstruction &&
        bracketsInConstruction === 0 &&
        !word.startsWith("{")
      ) {
        arrayInConstruction = false;
      }

      if (word.length > 2) {
        let w = word.slice(1, word.length - 1);
        if (word.startsWith('\\"')) w = w.slice(1);
        if (w.replaceAll('\\"', "").includes('"')) {
          return new resultWords(`invalid quotes in the middle of a word`);
        }
      }

      const isStartingQuotes =
        word.startsWith('"') && (word.length > 1 || !stringInConstruction);
      const isEndingQuotes =
        !word.endsWith('\\"') &&
        word.endsWith('"') &&
        (word.length > 1 || stringInConstruction);

      if (isStartingQuotes) {
        if (stringInConstruction)
          return new resultWords(`invalid quote delimitation 1`);
        stringInConstruction = true;
        if (!arrayInConstruction) words[i] = words[i].slice(1);
      }

      if (
        !stringInConstruction &&
        (word.slice(1).includes("{") ||
          word.slice(0, word.length - 1).includes("}"))
      ) {
        return new resultWords(`invalid brackets in the middle of a word`);
      }

      if (isEndingQuotes) {
        if (!stringInConstruction)
          return new resultWords(`invalid quote delimitation 2`);
        stringInConstruction = false;
        if (!arrayInConstruction)
          words[i] = words[i].slice(0, words[i].length - 1);
      }

      if (!arrayInConstruction) words[i] = words[i].replaceAll('\\"', '"');

      if (!isStartingQuotes && (stringInConstruction || isEndingQuotes)) {
        words[i - 1] += ` ${words[i]}`;
        words.splice(i, 1);
      } else {
        if (arrayInConstruction) {
          words[i - 1] += ` ${words[i]}`;
          words.splice(i, 1);
        } else {
          i += 1;
        }
        if (word.startsWith("{")) {
          bracketsInConstruction += 1;
          arrayInConstruction = true;
        }
        if (word.endsWith("}")) {
          bracketsInConstruction -= 1;
          if (bracketsInConstruction < 0)
            return new resultWords("extra closing bracket");
        }
      }
    }
    if (stringInConstruction) return new resultWords(`end quote missing`);
    if (bracketsInConstruction > 0)
      return new resultWords(`invalid bracket delimitation in phrase`);
    return new resultWords(null, words);
  }

  splitPhrasePattern(textInput: string): resultWords {
    const words = textInput.split(" ");
    let i = 0;
    let bracketsInConstruction = 0;
    while (i < words.length) {
      const word = words[i];

      if (
        word.slice(1).includes("{") ||
        word.slice(0, word.length - 1).includes("}")
      ) {
        return new resultWords(
          `invalid brackets in the middle of a word in the pattern`
        );
      }

      const isStartingBrackets = word.startsWith("{");
      const isEndingBrackets = !word.endsWith("\\}") && word.endsWith("}");

      if (isStartingBrackets) {
        if (bracketsInConstruction % 2 === 0)
          return new resultWords(`invalid bracket delimitation 1`);
        bracketsInConstruction += 1;
      }

      if (word.startsWith("%") || word.startsWith("{%")) {
        const parts = word.split("_");
        if (["repeated", "nested"].includes(parts[1])) {
          bracketsInConstruction += 1;
        }
      }

      if (isEndingBrackets) {
        if (bracketsInConstruction < 2 || bracketsInConstruction % 2 === 1)
          return new resultWords(`invalid bracket delimitation 2`);
        bracketsInConstruction -= 2;
      }

      if (bracketsInConstruction > 1 || isEndingBrackets) {
        words[i - 1] += ` ${words[i]}`;
        words.splice(i, 1);
      } else {
        i += 1;
      }
    }
    if (bracketsInConstruction > 0)
      return new resultWords(`invalid bracket delimitation 3`);
    return new resultWords(null, words);
  }
}
