// SPDX-License-Identifier: MIT
// Julian Gonzalez (joticajulian@gmail.com)

import { Base58, Base64, System } from "@koinos/sdk-as";

export class resultWords {
  error: string | null;

  words: string[] | null;

  constructor(error: string | null = null, words: string[] | null = []) {
    this.error = error;
    this.words = words;
  }
}

export class resultNumber {
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

export class messageField {
  protoId: i32;

  type: string | null;

  bool: boolean;

  string: string | null;

  bytes: Uint8Array | null;

  uint64: u64;

  uint32: u32;

  int64: i64;

  int32: i32;

  nested: Array<messageField> = [];

  repeated: Array<messageField> = [];
}

export class resultField {
  error: string | null;

  field: messageField;

  constructor(error: string | null = null) {
    this.error = error;
    this.field = new messageField();
  }
}

export class resultData {
  error: string | null;

  fields: Array<messageField> = [];

  constructor(error: string | null = null) {
    this.error = error;
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
    type: string
  ): resultNumber {
    let sign = "";
    let val = value;
    if (val.startsWith("-")) {
      if (type == "u64" || type == "u32") {
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
      decimalPart.length != decimals ||
      integerPart.length == 0 ||
      (integerPart.length > 1 && integerPart.startsWith("0"))
    ) {
      return new resultNumber(`invalid number ${value}`);
    }
    const numberString = `${sign}${integerPart}${decimalPart}`;
    if (type == "u64") {
      const num = U64.parseInt(numberString);
      return new resultNumber(null, num);
    }
    if (type == "u32") {
      const num = U32.parseInt(numberString);
      return new resultNumber(null, 0, num);
    }
    if (type == "i64") {
      const num = I64.parseInt(numberString);
      return new resultNumber(null, 0, 0, num);
    }
    if (type == "i32") {
      const num = I32.parseInt(numberString);
      return new resultNumber(null, 0, 0, 0, num);
    }
    return new resultNumber("internal error");
  }

  splitPhrase(textInput: string, groupArrays: boolean = true): resultWords {
    const words = textInput.split(" ");
    let i = 0;
    let bracketsInConstruction = 0;
    let arrayInConstruction = false;
    let stringInConstruction = false;
    while (i < words.length) {
      const word = words[i];

      if (!groupArrays && bracketsInConstruction == 0) {
        arrayInConstruction = false;
      }

      if (
        arrayInConstruction &&
        bracketsInConstruction == 0 &&
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
    if (stringInConstruction) return new resultWords(`missing end quote`);
    if (bracketsInConstruction > 0)
      return new resultWords(`missing closing bracket`);
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
        if (bracketsInConstruction % 2 == 0)
          return new resultWords(`invalid bracket delimitation 1`);
        bracketsInConstruction += 1;
      }

      if (word.startsWith("%") || word.startsWith("{%")) {
        const parts = word.split("_");
        if (parts.length < 2) return new resultWords(`invalid pattern ${word}`);
        if (["repeated", "nested"].includes(parts[1])) {
          bracketsInConstruction += 1;
        }
      }

      if (isEndingBrackets) {
        if (bracketsInConstruction < 2 || bracketsInConstruction % 2 == 1)
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

  removeBrackets(text: string): string {
    return text
      .trim()
      .slice(1, text.length - 1)
      .trim();
  }

  resolveKapAddress(name: string): resultField {
    return new resultField("KAP resolver not implemented");
  }

  resolveNicknameAddress(name: string): resultField {
    return new resultField("Nickname resolver not implemented");
  }

  parseField(textInput: string, patternWord: string): resultField {
    const parts = patternWord.split(" ")[0].slice(1).split("_");
    if (parts.length < 2)
      return new resultField(`invalid pattern ${patternWord}`);
    const result = new resultField();
    result.field.protoId = U32.parseInt(parts[0]);
    result.field.type = parts[1];
    const format = parts.length > 2 ? parts[2] : "";
    // if (Number.isNaN(protoId)) return { error: `invalid pattern ${patternWord}`};

    if (result.field.type == "bool") {
      if (textInput == "true") result.field.bool = true;
      else if (textInput == "false") result.field.bool = false;
      else return new resultField(`invalid bool value '${textInput}'`);
      return result;
    }

    if (result.field.type == "bytes") {
      if (format == "base64") {
        result.field.bytes = Base64.decode(textInput);
        return result;
      }
      if (format == "base58") {
        result.field.bytes = Base58.decode(textInput);
        return result;
      }
      if (format == "hex") {
        return new resultField("HEX format not implemented for bytes");
      }
      return new resultField(`invalid bytes format ${format}`);
    }

    if (result.field.type == "address") {
      result.field.type = "bytes";
      if (textInput.startsWith("@")) {
        const res = this.resolveNicknameAddress(textInput.slice(1));
        if (res.error) return res;
        result.field.bytes = res.field.bytes;
      } else if (textInput.startsWith("kap://")) {
        const res = this.resolveKapAddress(textInput.slice(6));
        if (res.error) return res;
        result.field.bytes = res.field.bytes;
      } else {
        result.field.bytes = Base58.decode(textInput);
      }
      return result;
    }

    if (result.field.type == "selfaddress") {
      result.field.type = "bytes";
      if (format != textInput) {
        return new resultField(
          `expected word '${format}', received '${textInput}'`
        );
      }
      const caller = System.getCaller().caller;
      result.field.bytes = caller ? caller : new Uint8Array(0);
      return result;
    }

    if (result.field.type == "string") {
      result.field.string = textInput;
      return result;
    }

    if (["u64", "u32", "i64", "i32"].includes(result.field.type!)) {
      let decimals: i32 = 0;
      if (format) decimals = I32.parseInt(format);
      const res = this.parseNumberWithDecimals(
        textInput,
        decimals,
        result.field.type!
      );
      if (res.error) return new resultField(res.error);

      if (result.field.type == "u64") {
        result.field.uint64 = res.uint64;
      } else if (result.field.type == "u32") {
        result.field.uint32 = res.uint32;
      } else if (result.field.type == "i64") {
        result.field.int64 = res.int64;
      } else {
        // "i32"
        result.field.int32 = res.int32;
      }
      return result;
    }

    if (result.field.type == "nested") {
      const i = patternWord.indexOf(" ") + 1;
      const phrasePattern = this.removeBrackets(patternWord.slice(i));
      const resSplit = this.splitPhrase(textInput, false);
      if (resSplit.error) return new resultField(resSplit.error);
      const phrases = resSplit.words!;

      if (phrases.length != 1) {
        return new resultField(`'${textInput}' must have a single element`);
      }
      const resMessage = this.parseMessage(
        this.removeBrackets(phrases[0]),
        phrasePattern
      );
      if (resMessage.error) return new resultField(resMessage.error);
      result.field.nested = resMessage.fields;
      return result;
    }

    if (result.field.type == "repeated") {
      const i = patternWord.indexOf(" ") + 1;
      const phrasePattern = this.removeBrackets(patternWord.slice(i));
      const resSplit = this.splitPhrase(textInput, false);
      if (resSplit.error) return new resultField(resSplit.error);
      const phrases = resSplit.words!;

      result.field.repeated = [];
      for (let i = 0; i < phrases.length; i += 1) {
        const resMessage = this.parseMessage(
          this.removeBrackets(phrases[i]),
          phrasePattern
        );
        if (resMessage.error) return new resultField(resMessage.error);
        for (let j = 0; j < resMessage.fields.length; j += 1) {
          result.field.repeated.push(resMessage.fields[j]);
        }
      }
      return result;
    }

    return new resultField(`${result.field.type!} type not implemented`);
  }

  parseMessage(phraseMessage: string, phrasePattern: string): resultData {
    const resSplitMessage = this.splitPhrase(phraseMessage);
    if (resSplitMessage.error) return new resultData(resSplitMessage.error);
    const messageWords = resSplitMessage.words!;

    const resSplitPattern = this.splitPhrasePattern(phrasePattern);
    if (resSplitPattern.error) return new resultData(resSplitPattern.error);
    const patternWords = resSplitPattern.words!;

    if (messageWords.length != patternWords.length)
      return new resultData("different size");

    const message = new resultData();
    for (let i = 0; i < messageWords.length; i += 1) {
      if (patternWords[i].startsWith("%")) {
        const res = this.parseField(messageWords[i], patternWords[i]);
        if (res.error) return new resultData(res.error);
        message.fields.push(res.field);
      } else if (messageWords[i] != patternWords[i].replaceAll("\\%", "%")) {
        return new resultData(
          `message part '${messageWords[i]}' and pattern part '${patternWords[i]}' are different`
        );
      }
    }
    return message;
  }
}
