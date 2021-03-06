'use strict';

var Constants = require('../../core/constants');
var BaseClient = require('../basic/client');

/**
 *
 */
class ClientPassThrough extends BaseClient {
  constructor(name, uuid, port, afterBinding) {
    super(name, uuid, port, afterBinding);
  }

  bindApp(app) { this.app = app; }

  updateGameList(data) {
    this.app.updateGameList(data);
  }

  setGameData(data) {
    super.setGameData(data);
    this.app.setGameData(JSON.parse(JSON.stringify(data)));
  }

  setInitialTiles(tiles, wallSize) {
    super.setInitialTiles(tiles, wallSize);
    this.app.setInitialTiles(JSON.parse(JSON.stringify(tiles)), wallSize);
  }

  addTile(tile, wallSize) {
    super.addTile(tile, wallSize);
    this.app.addTile(tile, wallSize);
  }

  playerReceivedDeal(position) {
    super.playerReceivedDeal(position);
    this.app.playerReceivedDeal(position);
  }

  discardTile(cleandeal) {
    this.app.setTilesPriorToDiscard(
      this.tiles.sort(Constants.sort).slice(),
      this.bonus.sort(Constants.sort).slice(),
      JSON.parse(JSON.stringify(this.revealed))
    );
  }

  discardFromApp(tile) {
    this.processTileDiscardChoice(tile);
  }

  determineClaim(from, tile, sendClaim) {
    this.app.determineClaim(from, tile, sendClaim);
  }

  processClaimAward(data) {
    var set = super.processClaimAward(data);
    this.app.processClaimAward(data);
    return set;
  }

  tileClaimed(tile, by, claimType, winType) {
    this.app.tileClaimed(tile, by, claimType, winType);
  }

  recordReveal(playerPosition, tiles) {
    super.recordReveal(playerPosition, tiles);
    this.app.recordReveal(playerPosition, tiles);
  }

  recordBonus(playerPosition, tiles) {
    super.recordBonus(playerPosition, tiles);
    this.app.recordBonus(playerPosition, tiles);
  }

  handDrawn(alltiles, acknowledged) {
    this.app.handDrawn(alltiles, acknowledged);
  }

  handWon(winner, selfdrawn, alltiles, acknowledged) {
    this.app.handWon(winner, selfdrawn, alltiles, acknowledged);
  }

  processScores(scores, playerScores) {
    super.processScores(scores, playerScores);
    this.app.processScores(scores, playerScores);
  }

  gameOver(gameid) {
    super.gameOver(gameid);
    this.app.gameOver(gameid);
  }

  // Asks the server to clear the timeout, to give
  // the user the time they ened to pick the right
  // claim type.
  requestTimeoutInvalidation() {
    this.connector.publish("request-timeout-invalidation",{});
  }
}

module.exports = ClientPassThrough;
