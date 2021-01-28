// logic.js is intended to hold all game logic

import seedrandom from "seedrandom";

import * as p2p from "./p2p.js";
import * as utils from "./utils.js";
import * as cards from "./cards.js";

import assert from "./assert.js";

// what's the game state?
// there's a public part and a private part
// the public part needs to be agreed upon among all players
// the private part is
//
// PUBLIC:
// for version 1:
// 1: the middle deck, which has order
// 2: each player's hand, which does not have order
//      invariant: all disjoint, union is all cards
//
// for version 2:
// 3: all the rule hashes
// 4:
//
// PRIVATE:
// for version 2:
// 1: your own rules (which is in the form of uhhhh)
//
//
//
// TODO: later version: add signatures to actually be secure

// WIRE PROTOCOL:
// always assume broadcast messages!!!!!!
// 1. setup:
//  1.1 everyone: READY hashOfRandomNumber userID (number is a 64-bit integers, user id is randomly generated (later should be public key))
//  1.2 when everyone you have open connections with say READY: START randomNumber  (userID is sent with every message)
//  1.3 when received all STARTs: verifies all hashes, xors all numbers, seed rng with this, then just pick cards
//  1.4 using same seed just choose order
// 2. play:
//  2.1 someone: PLAY card userID publicGameStateAfter
//  2.2 everyone else: PLAYACK card fromUser userID publicGameStateAfter
// 3. abort:
//  3.1 send ABORT userID to every user, be sad

// ok dont overthink it
// i think having a hierarchical state thing makes sense
// this is javascript not rust

// ok so we have:
// phase = {"setup", "play", "gameover", "abort"}
// each phase has some metadata, which can be public or private
// the public metadata is always sent over for debugging purposes

// transitions
// setup:
//      state = {"preReady","sentReady","sentStart"},
//      players, readyHashes, startNumbers, myRandom
//
// play:
//      nextTurn = user_id
//      public: players (order matters), playedCards (0 bottom, n-1 top), playerHands (id -> array)
//          invariant: union is good, disjoint
//
// gameover: (transitions directly to setup.sentReady)
//      winner = user_id
//
// abort:
//      (no data)

export const PHASE = {
  SETUP: "SETUP",
  PLAY: "PLAY",
  GAMEOVER: "GAMEOVER",
  ABORT: "ABORT",
};
const PHASES = Object.values(PHASE);
const SETUP_STATE = {
  PRE_READY: "PRE_READY",
  SENT_READY: "SENT_READY",
  SENT_START: "SENT_START",
};
const SETUP_STATES = Object.values(SETUP_STATE);

const METHOD = {
  READY: "READY",
  START: "START",
  PLAY: "PLAY",
  PLAYACK: "PLAYACK",
  ABORT: "ABORT",
};
const METHODS = Object.values(METHOD);
const METHOD_HANDLER = {
  [METHOD.READY]: handleReadyMethod,
  [METHOD.START]: handleStartMethod,
  [METHOD.PLAY]: handlePlayMethod,
  [METHOD.PLAYACK]: handlePlayAckMethod,
  [METHOD.ABORT]: handleAbortMethod,
};
assert(
  JSON.stringify(METHODS) === JSON.stringify(Object.keys(METHOD_HANDLER)),
  {
    methods: METHODS,
    handlers: METHOD_HANDLER,
  }
);

export function createGame(conn) {
  // TODO: generate private/public keypair here and let userId be the public key
  const userId = Math.random().toString(36).substr(2, 9);
  const game = {
    conn,
    listeners: {},
    listenerIndex: "0",
    phase: PHASE.SETUP,
    userId: userId,
    state: SETUP_STATE.PRE_READY,
    players: [userId],
    readyHashes: {},
    startNumbers: {},
    myRandom: null,
  };
  return game;
}
export function addListener(game, listener) {
  const indx = game.listenerIndex;
  game.listeners[indx] = listener;
  game.listenerIndex = `${parseInt(indx) + 1}`;
  return indx;
}
export function removeListener(game, key) {
  console.log(`removing key ${key} from game ${game}`);
  delete game.listener[key];
}
// this function needs to be called every time the game state is updated!!!!!!!!
function update(game) {
  for (let listener of Object.values(game.listeners)) {
    listener();
  }
}

// m should be on form {data: , method: , ...}
export function receive(game, m) {
  console.log("game receiving message!");
  console.log(m);
  if (m.type !== "data") {
    console.log("ignoring non-data message");
    return;
  }
  assert(METHODS.includes(m.method));
  console.log(METHOD_HANDLER);
  METHOD_HANDLER[m.method](game, m);
}
function send(game, m) {
  // TODO: sign the message
  m["from"] = game.userId;
  p2p.sendData(game.conn, m);
}

function unimplemented() {
  assert(false, "not implemented yet!!");
}

function handleReadyMethod(game, m) {
  // should be in setup phase
  if (game.phase !== PHASE.SETUP) abort(game);
  // should not have sent start already
  if (
    !(
      game.state === SETUP_STATE.PRE_READY ||
      game.state === SETUP_STATE.SENT_READY
    )
  ) {
    abort(game);
  }

  const user = m.from;
  const hash = m.hash;

  // shouldn't receive twice; should have different IDs
  if (game.players.includes(user)) abort(game);

  game.players.push(user);
  game.readyHashes[user] = hash;

  // if we have received all, send start
  maybeSendStart(game);

  update(game);
}
async function handleStartMethod(game, m) {
  // should be in setup phase
  if (game.phase !== PHASE.SETUP) abort(game, "wrong phase");
  // should have sent ready (not necessarily should have sent start though)
  if (
    !(
      game.state === SETUP_STATE.SENT_READY ||
      game.state === SETUP_STATE.SENT_START
    )
  ) {
    abort(game);
  }

  const user = m.from;
  const randomNumber = m.randomNumber;

  // shouldn't receive twice
  if (Object.keys(game.startNumbers).includes(user)) abort(game);

  // should receive from verified user
  if (!game.players.includes(user)) abort(game, `unknown user ${user}`);

  // assert that the hash is ok
  const randomNumberHash = await hash(`${randomNumber}`);
  if (game.readyHashes[user] !== randomNumberHash)
    abort(
      game,
      `incorrect hash ${randomNumberHash} received for random number ${randomNumber} from user ${user}`
    );

  // add to numbers
  game.startNumbers[user] = randomNumber;

  // if we have received all, go to the game!!
  maybeStartGame(game);

  update(game);
}
function handlePlayMethod(game, m) {
  unimplemented();

  update(game);
}
function handlePlayAckMethod(game, m) {
  unimplemented();

  update(game);
}
function handleAbortMethod(game, m) {
  console.log("ABORTING :(((( SAD");
  unimplemented();

  update(game);
}

function abort(game, reason) {
  console.error("ABORT GAME :((");
  console.error(reason);
  send(game, { method: METHOD.ABORT, reason });
  game.phase = PHASE.ABORT;

  update(game);
}

async function hash(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

export async function sendReady(game) {
  assert(
    (game.phase === PHASE.SETUP && game.state === SETUP_STATE.PRE_READY) ||
      game.phase === PHASE.GAMEOVER,
    game
  );
  // generate a random number
  game.myRandom = Math.floor(Math.random() * 2 ** 64);
  // hash the random number
  const hash_r = await hash(`${game.myRandom}`);
  console.log(hash_r);
  game.readyHashes[game.userId] = hash_r;
  send(game, { method: METHOD.READY, hash: hash_r });
  game.state = SETUP_STATE.SENT_READY;
  maybeSendStart(game);

  update(game);
}

function maybeStartGame(game) {
  if (game.players.length === Object.keys(game.startNumbers).length) {
    startGame(game);
  }
}
function startGame(game) {
  assert(
    game.phase === PHASE.SETUP && game.state === SETUP_STATE.SENT_START,
    game
  );

  // xor all the random numbers (which means that as long as at least 1 person honest, it is random)
  let finalRandomNumber = 0;
  Object.values(game.startNumbers).forEach((randomNumber) => {
    finalRandomNumber ^= randomNumber;
  });

  console.log(`final randomness: ${finalRandomNumber}`);
  // use this random number as the seed of an rng
  let rng = seedrandom(`${finalRandomNumber}`);

  // now we can transition to the game phase
  // delete the old game object properties
  delete game.state;
  delete game.readyHashes;
  delete game.startNumbers;
  delete game.myRandom;

  // shuffle the player list
  // note: we need to sort it first before we do it so everyone gets the same list
  game.players = utils.shuffle(game.players.sort(), rng);

  game.nextTurn = game.players[0];

  game.playedCards = []; // start empty

  // now deal cards
  game.playerHands = cards.dealShuffledCards(
    utils.shuffle(game.players, rng),
    rng
  );

  // now we're done :))))))
  game.phase = PHASE.PLAY;

  console.log("STARTING GAME!!!! exciting :)))");
  console.log(game);

  update(game);
}

function maybeSendStart(game) {
  if (
    p2p.numConnections(game.conn) ===
    Object.keys(game.readyHashes).length - 1
  ) {
    assert(game.players.length === Object.keys(game.readyHashes).length, game);
    sendStart(game);
  }
}
function sendStart(game) {
  assert(
    game.phase === PHASE.SETUP && game.state === SETUP_STATE.SENT_READY,
    game
  );

  send(game, { method: METHOD.START, randomNumber: game.myRandom });

  game.startNumbers[game.userId] = game.myRandom;
  game.state = SETUP_STATE.SENT_START;

  maybeStartGame(game);

  update(game);
}

// convenience for 2 players
// TODO: update this for more players

export function getMyUserId(game) {
  return game.userId;
}
export function getOppUserId(game) {
  return game.players.filter((x) => x !== getMyUserId(game))[0];
}
export function getMyHand(game) {
  return game.playerHands[getMyUserId(game)];
}
export function getOppHand(game) {
  return game.playerHands[getOppUserId(game)];
}
