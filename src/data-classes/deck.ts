/**
 * Created by Joshua Jackson on 19-Feb-17.
 */

import { Card } from './card';

// ======================================================================
// This Class outlines the data structure and methods of a Deck
// ======================================================================
export class Deck {
  deckID;        // Unique deck id
  blackCards;    // Array of Cards of 'black' type
  whiteCards;    // Array of Cards of 'white' type
  discards;      // Array of discarded cards (includes both 'white' and 'black' cards)

  constructor(deckID: string, blackCards?: Array<Card>, whiteCards?: Array<Card>) {
    this.deckID = deckID;

    if (blackCards) {
      this.blackCards = blackCards;
    } else {
      this.blackCards = [];
    }

    if (whiteCards) {
      this.whiteCards = whiteCards;
    } else {
      this.whiteCards = [];
    }

    this.discards = [];
  }

  // adds given card to cards
  addCard(card: Card) {
    if (card.type == 'white') {
      this.whiteCards.push(card);
    } else if (card.type == 'black') {
      this.blackCards.push(card);
    } else {
      console.log('ERROR: attempted to add card of unknown type to deck!');
    }
  }

  // removes given card from cards
  removeCard(card: Card) {
    if (card.type == 'white') {
      this.whiteCards.remove(card);
    } else if (card.type == 'black') {
      this.blackCards.remove(card);
    } else {
      console.log('ERROR: attempted to add card of unknown type to deck!');
    }
  }

  // shuffles the cards in the deck
  shuffle() {
    console.log('STUB: deck.shuffle()');
  }

  // returns next white card in deck that hasn't been discarded
  // returns false if all cards have been discarded
  drawWhiteCard() : Card | false {
    return this.drawCard('white');
  }

  // returns next black card in deck that hasn't been discarded
  // returns false if all cards have been discarded
  drawBlackCard() : Card | false {
    return this.drawCard('black');
  }

  // taking a string type as a param is more flexible in case we eventually
  // implement drawing a card of any type, etc
  drawCard(type: string) {
    console.log('start drawCard');
    var cards = (type == 'white') ? this.whiteCards : this.blackCards;
    for (var i=0; i<cards.length; i++) {
      if (cards[i].type == type) {
        // if the potential drawn card hasnt been discarded
        if (!Card.member(cards[i], this.discards)) {
          this.discard(cards[i]);
          return cards[i];
        }
      }
    }
    // stub returns first card everytime
    return false;
  }

  // adds given card to discards array
  discard(card: Card) {
    console.log('discarding card: ' + card.content);
    if (!Card.member(card, this.discards)) {
      console.log('pushing card:');
      console.log(card);
      this.discards.push(card);
    } else {
      console.log('tried to discard a card ALREADY in the discards (probably just playing a black card)');
    }
    console.log('new discards: ');
    console.log(this.discards);
  }

  // empties the discards array
  reset() {
    console.log('reset deck discards array');
    this.discards = [];
  }

  // prints the deck to the console
  printDeck() {
    console.log("Deck ID: " + this.deckID);
    console.log("Cards:");
    for(let c of this.whiteCards){
      console.log(" " + c.content);
    }
    for(let c of this.blackCards){
      console.log(" " + c.content);
    }
  }
}
