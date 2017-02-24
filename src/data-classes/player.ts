/**
 * Created by jjxn on 2/19/2017.
 */

// ======================================================================
// This Class outlines the data structure of a Player
// ======================================================================
export class Player {
  username: string;
  score: number;
  id: string;

  constructor(username: string, id?: string) {
    this.username = username;
    this.score = 0;
    this.id = id;
  }
  // Prints information about the player to the console
  print(){
    console.log(this.username + " ID: (" + this.id + ")- " + this.score);
  }

  static getPlayerIndex(players: Array<Player>, username: string) : number {
    for (var i = 0; i < players.length; i++) {
      if (players[i].username == username) return i;
    }
    return -1;
  }

}

