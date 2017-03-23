/**
 * Created by Joshua Jackson on 18-Feb-17.
 */

import PubNub from 'pubnub';
import { Tools } from '../../tools/general-tools';
import { Deck } from '../../data-classes/deck';
import { Card } from '../../data-classes/card';
import { CardSubmission } from '../../data-classes/card-submission';
import { Player } from '../../data-classes/player';
import { PubNubMsg } from '../../data-classes/pubnub-msg';
import { IGameRenderer } from './i-game-renderer';

// ======================================================================
// This Class contains the gamestate and methods to modify/play the game.
// This Class also includes the game logic loop.
// ======================================================================
export class GamePlay {
  // constants
  CHANNEL: string;                // The channel used will NOT change during gameplay
  SUBKEY: string;                 // The subscription key user will NOT change during gameplay
  PUBKEY: string;                 // The publish key user will NOT change during gameplay
  PLAYER_USERNAME: string;        // This player's name. Name does NOT change during gameplay
  NUM_CARDS_HAND: number;         // The number of cards per hand does NOT change during gameplay
  NUM_WINNING_POINTS: number;     // The number of points a player needs to win the game

  // Object Singletons
  PubNub;                         // This client's pubnub object
  GameRenderer;                   // GameRenderer singleton reference

  // global variables
  deck: Deck;                     // The Deck object associated with this specific game
  players: Array<Player>;         // Array of players currently in the game
  hand: Array<Card>;              // Array of cards
  gameStarted: boolean;
  collectingCards: boolean;
  roundNumber: number;            // Current round number
  judge: Player;                  // Current judge username
  blackCard: Card;                // Current black card for round
  continueCounter: number;        // Current number of players ready to continue
  cardsSubmitted: Array<CardSubmission>;  // Array of cards played in current round
  joinedCount: number;

  constructor(channel: string,
              subkey: string,
              pubkey: string,
              playerUsername: string,  // TODO: a player's username MUST be unique during a game
              players: Array<Player>,
              deck: Deck,
              gameRenderer: IGameRenderer
              ) {

    this.CHANNEL = channel;
    this.SUBKEY = subkey;
    this.PUBKEY = pubkey;
    this.PLAYER_USERNAME = playerUsername;

    this.players = players;
    this.deck = deck;
    this.GameRenderer = gameRenderer;

    this.NUM_CARDS_HAND = 5;     // TODO: move value to config file
    this.NUM_WINNING_POINTS = 3; // TODO: move value to config file
    this.gameStarted = false;
    this.collectingCards = false;
    this.roundNumber = 0;
    this.continueCounter = 0;
    this.hand = [];
    this.cardsSubmitted = [];
    this.joinedCount = 0;

    console.log('I am: ' + this.PLAYER_USERNAME);

    this.PubNub = new PubNub({
      subscribeKey: this.SUBKEY, // always required
      publishKey: this.PUBKEY,   // only required if publishing
      uuid: this.PLAYER_USERNAME,
      presenceTimeout: 30
    });

    // TODO: switch all references to 'this' to 'gamePlay'
    var GamePlay = this;

    // set up listeners for different events
    this.PubNub.addListener({
      status: function(statusEvent) {
        if (statusEvent.category === 'PNConnectedCategory') {
          console.log('PNConnectedCategory');
        } else if (statusEvent.category === 'PNUnknownCategory') {
          var newState = {
            new: 'error'
          };
          this.PubNub.setState(
            {
              state: newState
            },
            function (status) {
              console.log(statusEvent.errorData.message)
            }
          );
        }
      },

      message: function(msg) {
        GamePlay.handleEvent(msg);
      },

      presence: function(p) {
        GamePlay.handlePresence(p);
      },
    });

    // subscribe to pubnub channel
    this.PubNub.subscribe({
      channels: [this.CHANNEL],
      withPresence: true
    });
  }

  // ======================================================================
  // Functions below
  // ======================================================================

  // sends PubNubMsg indicating that this player is ready to start the game
  // signalReady() {
  //   var msg = new PubNubMsg('READY', 'null');  // TODO: is null necessary?
  //   this.sendMsg(msg);
  // }

  // deals out (NUM_CARDS_HAND - 1) cards and then indirectly starts new round
  startGame() {
    console.log('start new game');
    // deal out (NUM_CARDS_HAND - 1) cards then starts new round
    for (var i=1; i<this.NUM_CARDS_HAND; i++) {
      var card = this.deck.drawWhiteCard();
      if (card) {
        this.hand.push(card);
      } else {
        console.log('ERROR: this.deck.drawWhiteCard returned false');
      }
    }

    // start new round
    var newRoundMsg = JSON.stringify(new PubNubMsg('NEW_ROUND', 'null'));  // TODO: is null necessary?
    this.handleEvent({message:newRoundMsg});
  }

  // updates the judge field to the appropriate next judge
  setNextJudge() {
    if (this.judge == null) {
      this.judge = this.players[0];
    } else {
      var index = (this.players.indexOf(this.judge)+1) % this.players.length;
      this.judge = this.players[index];
    }
    console.log('set judge to: ' + this.judge.username);
  }

  // submits the given card through a pubnub msg on the pubnub game channel
  playCard(card: Card) {
    console.log('playCard card:');
    console.log(card);
    if (card.type == 'white') {
      var cardSubmission = new CardSubmission(this.PLAYER_USERNAME, card);
      var msg = new PubNubMsg('PLAY_WHITE_CARD', JSON.stringify(cardSubmission));
      this.sendMsg(msg);

      var index = Card.indexIn(card, this.hand);
      if (index != -1) {
        this.hand.splice(index, 1);
      } else {
        console.log("ERROR: tried to play a card that somehow wasn't in this.hands");
      }

    } else if (card.type == 'black') {
      var cardSubmission = new CardSubmission(this.PLAYER_USERNAME, card);
      var msg = new PubNubMsg('PLAY_BLACK_CARD', JSON.stringify(cardSubmission));
      this.sendMsg(msg);
    } else {
      console.log('ERROR: playCard card.type was invalid');
    }
  }

  // submits given winning card over pubnub game channel
  pickWinningCard(cardSubmission: CardSubmission) {
    var msg = new PubNubMsg('PICK_WINNING_CARD', JSON.stringify(cardSubmission));
    this.sendMsg(msg);
  }

  // requests the game continues
  requestContinue() {
    console.log('REQUESTING CONTINUE: this.PLAYER_USERNAME: ' + this.PLAYER_USERNAME);
    var msg = new PubNubMsg('REQUEST_CONTINUE', JSON.stringify(this.PLAYER_USERNAME));
    this.sendMsg(msg);
  }

  // increments the score of the player associated with the given winning CardSubmission
  updateScores(winningCardSubmission: CardSubmission) {
    console.log('STUB: updateScores()');
    for (var i=0; i<this.players.length; i++) {
      if (this.players[i].username == winningCardSubmission.username) {
        this.players[i].score++;
      }
    }
  }

  // returns boolean indicating if a player has scored enough points to win the game
  isGameOver(): boolean {
    for (var i=0; i<this.players.length; i++) {
      if (this.players[i].score >= this.NUM_WINNING_POINTS) {
        return true;
      }
    }
    return false;
  }

  // returns the player with the current highest score
  getLeadingPlayer(): Player {
    var leader = this.players[0];
    for (var i=0; i<this.players.length; i++) {
      if (this.players[i].score >= leader.score) {
        leader = this.players[i];
      }
    }
    return leader;
  }

  // sends given msg over this client's pubnub game channel
  sendMsg(msg: PubNubMsg) {
    this.PubNub.publish({
      channel :  this.CHANNEL,
      message : JSON.stringify(msg) });
  }

  // sends PubNub message indicating player has joined the game
  signalJoined() {
    console.log('signalJoined');
    //this.sendMsg(new PubNubMsg('JOINED', JSON.stringify(this.PLAYER_USERNAME)));
  }

  // sends PubNub message indicating player has joined the game
  signalLeaving() {
    console.log('signalLeaving');
    //this.sendMsg(new PubNubMsg('PLAYER_LEFT', JSON.stringify(this.PLAYER_USERNAME)));

    this.PubNub.unsubscribe({
      channels: [this.CHANNEL]
    });
  }

  // handles a PubNub presence event. Starts the game when enough players have joined.
  handlePresence(p) {
    console.log(p);
    if (p.action == 'join') {
      this.handlePubNubMsg(new PubNubMsg('JOINED', JSON.stringify(p.uuid)));
    } else if (p.action == 'leave') {
      console.log('detected ' + p.uuid + ' left!');
      this.handlePubNubMsg(new PubNubMsg('PLAYER_LEFT', JSON.stringify(p.uuid)));
    }
  }

  handleEvent(pubnubEvent) {
    console.log(pubnubEvent);

    var pubnubMsg = JSON.parse(pubnubEvent.message);
    this.handlePubNubMsg(pubnubMsg)
  }


  // ======================================================================
  // The Game Logic Event Handler
  // This splendid switch makes moves and renders results
  // ======================================================================
  handlePubNubMsg(pubnubMsg: PubNubMsg) { // the parameter type is set by pubnub
    // console.log(pubnubEvent);
    //
    // var pubnubMsg = JSON.parse(pubnubEvent.message);

    // check if the received msg adhers to our PubNubMsg Class
    if (pubnubMsg.hasOwnProperty('code') && pubnubMsg.hasOwnProperty('content')) {
      var content = JSON.parse(pubnubMsg.content);
    } else {
      alert("receieved a PubNub message that I don't recognize. See console.");
      console.log('pubnubMsg:');
      console.log(pubnubMsg);
      pubnubMsg.code = 'default';
    }

    var GameRenderer = this.GameRenderer;  // for readability
    var GamePlay = this;                   // for readability

    switch (pubnubMsg.code) {
      case 'JOINED':
        console.log('case: JOINED');
        this.joinedCount++;

        if (this.joinedCount == GamePlay.players.length) {
          console.log('sendMsg START_GAME');
          GamePlay.sendMsg(new PubNubMsg('START_GAME', 'null'));  // TODO: is null necessary?
        } else if (this.joinedCount > GamePlay.players.length) {
          console.log('this.joinedCount >= this.PLAYERS.length!');
        }

        break;

      case 'START_GAME':
        console.log('case: START_GAME');
        if(!this.gameStarted) {
          // only start the game once
          this.gameStarted = true;

          // http://imgur.com/a/38VII
          GamePlay.startGame();
        } else {
          console.log('told to START_GAME, but game already started. Must have concurrent player joins. ');
        }
        break;

      case 'PLAY_WHITE_CARD':
        console.log('case: PLAY_WHITE_CARD');
        var whiteCardSubmission = content; // for readability
        GamePlay.cardsSubmitted.push(whiteCardSubmission);

        // if all cards submitted
        if (GamePlay.cardsSubmitted.length >= (GamePlay.players.length - 1)) { // -1 for the judge
          this.collectingCards = false;
          if (GamePlay.judge.username == GamePlay.PLAYER_USERNAME) {  // if we are the judge
            GameRenderer.renderCardsSubmitted(Tools.clone(GamePlay.cardsSubmitted), true);
            GameRenderer.renderText('Pick a Winner');
          } else {
            GameRenderer.renderCardsSubmitted(Tools.clone(GamePlay.cardsSubmitted), false);
            GameRenderer.renderText('Waiting for judge to pick winner...');
          }
        }
        break;

      case 'PLAY_BLACK_CARD':
        console.log('case: PLAY_BLACK_CARD');
        var blackCard = new Card(content.card.type, content.card.content); // cast/set as Card object
        GamePlay.deck.discard(blackCard);
        GamePlay.blackCard = blackCard;
        GameRenderer.renderBlackCard(Tools.clone(blackCard));
        break;

      case 'PICK_WINNING_CARD':
        console.log('case: PICK_WINNING_CARD');
        var winningCardSubmission = content; // for readability

        GamePlay.updateScores(winningCardSubmission);
        GameRenderer.renderScores(Tools.clone(GamePlay.players));
        GamePlay.cardsSubmitted = [];
        GameRenderer.clearCardsSubmitted();
        GameRenderer.renderWinningCard(Tools.clone(winningCardSubmission));

        // check if game ended
        if (GamePlay.isGameOver()) {
          GameRenderer.renderText(GamePlay.getLeadingPlayer().username + ' won the game!');
          GameRenderer.renderGameOver(Tools.clone(GamePlay.players));
        } else {
          GameRenderer.renderText(winningCardSubmission.card.content + ' won the round!');
          GameRenderer.renderContinueButton();
        }
        break;

      case 'REQUEST_CONTINUE':
        console.log('case: REQUEST_CONTINUE');
        GamePlay.continueCounter++;
        // TODO: what if someone exits the game and doesn't click 'continue'?
        if (GamePlay.continueCounter >= GamePlay.players.length) {
          GamePlay.continueCounter = 0;
          GameRenderer.clearContinueButton();

          // start new round
          var newRoundMsg = JSON.stringify(new PubNubMsg('NEW_ROUND', 'null'));
          this.handleEvent({message:newRoundMsg});
        }

        //GameRenderer.renderContinueRequest(Tools.clone(content));
        break;

      case 'NEW_ROUND':
        console.log('case: NEW_ROUND');
        this.collectingCards = true;
        GamePlay.roundNumber++;
        GamePlay.setNextJudge();

        if (GamePlay.judge.username == GamePlay.PLAYER_USERNAME) { // if I'm the judge
          GameRenderer.requestPlayCard(GamePlay.deck.drawBlackCard());
          GameRenderer.renderText('Waiting for players to submit cards...');
        } else { // if I'm not the judge
          var card = GamePlay.deck.drawWhiteCard();
          if (card != false) {
            GamePlay.hand.push(card);
          } else {
            console.log('ERROR: tried to draw a white card but received false');
          }
          GameRenderer.renderHand(Tools.clone(GamePlay.hand));
          GameRenderer.renderText('Pick a card to play');
        }
        break;

      case 'PLAYER_LEFT':
        var absentPlayerUsername = content;

        if (this.judge.username == absentPlayerUsername) {  // if the judge
          console.log('judge left');
          // TODO: fix/address this assumption:
          // assuming the judge who left didn't pick a winning card...

          GamePlay.cardsSubmitted = [];
          GameRenderer.clearCardsSubmitted();
          GameRenderer.renderText('The judge: ' + absentPlayerUsername + ' left the game!');

          // start new round
          var newRoundMsg = JSON.stringify(new PubNubMsg('NEW_ROUND', 'null'));
          this.handleEvent({message: newRoundMsg});
        } else if (this.collectingCards) {
          // we were waiting on card submissions when a player left

          // check if they left before/after submitting a card
          var potCardSubmission = CardSubmission.getCardSubmissionByUsername(this.cardsSubmitted, absentPlayerUsername);

          if ( potCardSubmission != undefined) {
            console.log('Player: ' + absentPlayerUsername + ' left a round in progress AFTER submitting a card');
            // they submitted a card:
            GamePlay.cardsSubmitted = CardSubmission.removeCardSubmission(GamePlay.cardsSubmitted, potCardSubmission);
            console.log('cardsSubmitted after purging his:');
            console.log(GamePlay.cardsSubmitted);
          } else {
            console.log('Player: ' + absentPlayerUsername + ' left a round in progress BEFORE submitting a card');
            // they didn't submit a card:

            // // we'll submit an 'abstain_white' card on their behalf (only we see this)
            // var abstainCard = new Card('abstain_white', '');
            // var abstainCardSub = new CardSubmission(absentPlayerUsername, abstainCard);
            // var abstainMsg = new PubNubMsg('PLAY_WHITE_CARD', JSON.stringify(abstainCardSub));

            // this.handlePubNubMsg(abstainMsg);
          }
          GameRenderer.renderText('Player: ' + absentPlayerUsername + ' left the game!');
        }



        // purge the player who left
        console.log('purging playerIndex: ' + Player.getPlayerIndex(this.players, absentPlayerUsername));
        this.players.splice(Player.getPlayerIndex(this.players, absentPlayerUsername), 1);
        console.log('post purge players:');
        console.log(this.players);

        // we need at least 3 players to play
        if ((this.players.length) >= 3) {
          console.log('we CAN continue without him!');
          if(this.collectingCards) { // if we were collection cards
            // check if round continues:
            // if all cards submitted
            if (GamePlay.cardsSubmitted.length >= (GamePlay.players.length - 1)) { // -1 for judge
              if (GamePlay.judge.username == GamePlay.PLAYER_USERNAME) {  // if we are the judge
                GameRenderer.renderCardsSubmitted(Tools.clone(GamePlay.cardsSubmitted), true);
                GameRenderer.renderText('Pick a Winner');
              } else {
                GameRenderer.renderCardsSubmitted(Tools.clone(GamePlay.cardsSubmitted), false);
                GameRenderer.renderText('Waiting for judge to pick winner...');
              }
            }
          } else {
            console.log('we were not collecting cards when he died');
          }

        } else {  // not enough players to continue the game...
          console.log('we can NOT continue without him!');
          alert('too few players. gg');
        }
        break;

      default:
        console.log('ERROR: default case reached in handleMsg');
    }
  }
}

