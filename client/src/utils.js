/* global BigInt */
import assert from "./assert.js";

export function shuffle(array, rng) {
  var currentIndex = array.length,
    temporaryValue,
    randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(rng() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}
export async function compileUserRule(rule) {
  const ruleLength = 30;
  let funcRule = await constructFunction(rule);
  let compiledRule = new Array(ruleLength).fill(BigInt(0));
  for (var card2 = 0; card2 < 53; card2++) {
    for (var card1 = 0; card1 < 53; card1++) {
      for (var lastcard = 0; lastcard < 2; lastcard++) {
        let val = await evaluateFuncRule(
          funcRule,
          lastcard === 1,
          card1,
          card2
        );
        let bitNum = await computeBitNumber(lastcard === 1, card1, card2);
        if (val) {
          await populateBit(compiledRule, bitNum);
        }
      }
    }
  }
  compiledRule[29] = BigInt(Math.floor(1000000 * Math.random()));
  console.log("result of compiling " + rule + "is");
  for (var i = 0; i < 30; i++) {
    compiledRule[i] = `${compiledRule[i]}`;
  }
  console.log(compiledRule);
  return compiledRule;
}

async function constructFunction(rule) {
  let prefix = "async function f(lastcard, card1, card2){\n";
  let suffix = "\n}";
  return prefix.concat(rule).concat(suffix);
}

async function evaluateFuncRule(funcRule, lastcard, card1, card2) {
  let code = funcRule + `\nf(${lastcard},${card1},${card2});`;
  try {
    return eval(code);
  } catch (e) {
    if (e instanceof SyntaxError) {
      alert(e.message);
    }
  }
}
async function computeBitNumber(lastcard, card1, card2) {
  return lastcard + 2 * card1 + 2 * 53 * card2;
}
async function populateBit(compiledRule, bitNum) {
  let bitInIndex = bitNum % 200;
  let numberIndex = (bitNum - bitInIndex) / 200;
  compiledRule[numberIndex] += BigInt(2) ** BigInt(bitInIndex);
}

export function unimplemented() {
  assert(false, "not implemented yet!!");
}

export async function hash(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

export function objectify(obj) {
  return JSON.parse(
    JSON.stringify(
      obj,
      (_, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    )
  );
}
