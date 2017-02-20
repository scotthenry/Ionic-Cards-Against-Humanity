/**
 * Created by Joshua Jackson on 19-Feb-17.
 */

import { Card } from './card.ts';

export class Deck {
  deckID;
  cards;    // array of Card
  discards;

  constructor(deckID: string) {
    this.deckID = deckID;
    this.cards = [];
    this.discards = [];
  }

  // adds given card to cards
  addCard(card: typeof Card) {
    this.cards.push(card);
  }

  // removes given card from cards
  removeCard(card: typeof Card) {
    this.cards.remove(card);
  }

  // shuffles the cards in the deck
  shuffle() {
    console.log('deck.shuffle() stub');
  }

  // returns next card in deck that hasn't been discarded
  // returns false if all cards have been discarded
  drawCard() : typeof Card | false {
    for (var i=0; i<this.cards.length; i++) {
      // if the potential drawn card hasnt been discarded
      if (!member(this.cards[i], this.discards)) {
        this.discards.push(this.cards[i]);
        return this.cards[i];
      }
    }
    // stub returns first card everytime
    return false;
  }

  // adds given card to discards array
  discard(card: typeof Card) {
    this.discards.push(card);
  }

  // empties the discards array
  reset() {
    this.discards = [];
  }

}

// TODO: perhaps this can be put into a general typescript 'functions' file so that other code can access it
// returns true if given element is a member of the given array.
function member(ele, array) : boolean {
  for(var i=0; i<array.length; i++) {
    if (array[i] == ele) return true;
  }
  return false;
}