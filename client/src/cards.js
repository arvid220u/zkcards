import * as utils from "./utils.js";

export const RANK = {
  ACE: "A",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  SEVEN: "7",
  EIGHT: "8",
  NINE: "9",
  TEN: "10",
  JACK: "J",
  QUEEN: "Q",
  KING: "K",
};
export const RANKS = [
  RANK.ACE,
  RANK.TWO,
  RANK.THREE,
  RANK.FOUR,
  RANK.FIVE,
  RANK.SIX,
  RANK.SEVEN,
  RANK.EIGHT,
  RANK.NINE,
  RANK.TEN,
  RANK.JACK,
  RANK.QUEEN,
  RANK.KING,
]; // dont do Object.values because we want to guarantee order
export const SUIT = {
  SPADES: "spades",
  HEARTS: "hearts",
  DIAMONDS: "diamonds",
  CLUBS: "clubs",
};
export const SUITS = [SUIT.SPADES, SUIT.HEARTS, SUIT.DIAMONDS, SUIT.CLUBS]; // dont do Object.values because we want to guarantee order

//      card is represented by {rank:, suit:} (why no types :(((()))))

export function orderedDeck() {
  let deck = [];
  let suit_index = 0;
  for (const suit of SUITS) {
    let rank_index = 0;
    for (const rank of RANKS) {
      deck.push({ rank, suit, rank_index, suit_index });
      rank_index++;
    }
    suit_index++;
  }
  return deck;
}

export function shuffledDeck(rng) {
  let deck = orderedDeck();
  return utils.shuffle(deck, rng);
}

// users: list of IDs for each user who wants a card
// return: an object {user_id -> array of cards}, as even as possible, union is all cards, disjoint
export function dealShuffledCards(users, rng) {
  let deck = shuffledDeck(rng);
  let cards = {};
  let index = 0;
  for (const user of users) {
    cards[user] = [];
  }
  while (index < deck.length) {
    for (const user of users) {
      cards[user].push(deck[index]);
      index++;
    }
  }
  return cards;
}

export function serializeCard(card) {
  const aceOfSpades = "🂡";
  const firstChar = aceOfSpades.charCodeAt(0);
  const secondChar = aceOfSpades.charCodeAt(1);
  return (
    String.fromCharCode(firstChar) +
    String.fromCharCode(
      secondChar +
        card.rank_index +
        card.suit_index * 16 +
        (card.rank === RANK.QUEEN || card.rank === RANK.KING ? 1 : 0)
    )
  );
}

export function serializeDeck(deck) {
  let deckstr = "";
  for (const card of deck) {
    deckstr += serializeCard(card);
  }
  return deckstr;
}