var React = require('react');
var ReactDOM = require('react-dom');

var Settings = require('../lib/playersettings');
var Constants = require('../../../core/constants');
var Tiles = require('../../../core/tiles');
var ClientPassThrough  = require('../lib/client-pass-through');

var Tile = require('./Tile.jsx');
var Overlay = require('./Overlay.jsx');
var ClaimMenu = require('./ClaimMenu.jsx');

/**
 * ES5, because ES6 and React are a bad trip.
 */
var ClientApp = React.createClass({
  getInitialState() {
    var params = {};
    window.location.search.replace('?','').split('&').forEach(t => {
      let v = t.split('=');
      params[v[0]] = v[1];
    });

    return {
      client: false,
      settings: new Settings(params.localStorageId),
      currentDiscard: false
    };
  },

  render() {
    return (
      <div className="client">
        <Overlay>{this.state.modal ? this.state.modal : null}</Overlay>
        <input type="text" value={this.state.settings.name} onChange={this.changePlayerName} />
        { this.state.client ? null : <button onClick={this.registerPlayer}>register player</button> }
        { this.state.currentGame ? <div>Client connected using a websocket on port {this.state.client.connector.port}</div> : null }
        { this.renderLobby() }
        { this.renderDiscard() }
        { this.renderTiles() }
        { this.renderOthers() }
      </div>
    );
  },

  renderLobby() {
    if (!this.state.client) return null;
    return (
      <div>
        <hr/>
        {this.state.currentGame ? null : <button onClick={this.startGame}>Start a game</button> }
      </div>
    );
  },

  renderTiles() {
    if (!this.state.tiles) return null;

    var dpos = this.state.tiles.indexOf(this.state.drawtile);
    var tiles = this.state.tiles.map((tile,id) => {
      var highlight = (dpos && dpos===id);
      return <Tile disabled={!this.state.discarding} key={tile+'-'+id} onClick={this.discard} value={tile} highlight={highlight}/>;
    });

    var bonus = this.state.bonus.map((tile,id) => {
      return <Tile disabled="disabled" key={tile+'-'+id} value={tile} />;
    });
    var revealed = this.state.revealed.map((set,sid) => {
      return <div>{
        set.map((tile,id) => {
          let key ='set-'+sid+'-'+tile+'-'+id;
          return <Tile disabled="disabled" key={key} value={tile} />;
        })
      }</div>;
    });
    return <div className="player">
      <div className="name">{this.state.settings.name} ({this.getWindFor(this.state.currentGame.position)})</div>
      <div className="tiles">{tiles}</div>
      <div className="revealed">{revealed}</div>
      <div className="bonus">{bonus}</div>
    </div>;
  },

  renderConcealedTiles(n) {
    var tiles = [];
    while(n--) { tiles.push(<Tile value='concealed'/>); }
    return tiles;
  },

  renderOthers() {
    if (!this.state.players) return null;
    var players = this.state.players.filter(p => !!p).map(player => {
      return <div className="player">
        <div className="name">{this.linkPlayerName(player.name)} ({this.getWindFor(player.position)})</div>
        <div className="handsize">{ this.renderConcealedTiles(player.handSize) }</div>
        <div className="revealed">{player.revealed.map(set => {
          return set.map(tile => <Tile value={tile}/>);
        })}</div>
        <div className="bonus">{player.bonus.map(tile => <Tile value={tile}/>)}</div>
      </div>;
    });
    return <div className="others">{players}</div>;
  },

  linkPlayerName(name) {
    var bits = name.split(' ');
    var wiki = bits.slice(1).map((s,id) => id===0? s : s.toLowerCase()).join(' ');
    return <span>{bits[0]} <a href={"https://wikipedia.org/wiki/" + wiki} target="_blank">{wiki}</a></span>;
  },

  getWindFor(position) {
    return Tiles.getPositionWind(position);
  },

  renderDiscard() {
    var content = null;
    if (this.state.currentDiscard) {
      var from = this.state.players[this.state.currentDiscard.from].name;
      content = this.state.claiming ? this.renderClaim() : <div>
        <button onClick={this.getClaim}>claim</button>
        &nbsp;or&nbsp;
        <button onClick={this.ignoreClaim}>dismiss</button>
        &nbsp;tile&nbsp;
        <Tile value={this.state.currentDiscard.tile} />
        &nbsp;discarded by {from}
      </div>;
    }
    return <div className="discard">{content}</div>;
  },

  renderClaim() {
    var from = this.state.currentDiscard.from;
    var mayChow = (from + 1)%4 === this.state.currentGame.position;
    return <ClaimMenu mayChow={mayChow} claim={this.sendClaim} />;
  },

  changePlayerName(evt) {
    var settings = this.state.settings;
    settings.setName(evt.target.value);
    this.setState({ settings });
  },

  registerPlayer() {
    var name = this.state.settings.name;
    fetch('/register/pomax')
    .then(response => response.json())
    .then(data => {
      var id = data.id;
      var port = data.port;
      new ClientPassThrough(name, port, client => {
        this.setState({ id, port, client });
        client.bindApp(this);
      });
    });
  },

  startGame() {
    fetch('/game/new/' + this.state.id + '/' + this.state.settings.name)
    .then(response => response.json())
    .then(data => {
      // the actual play negotiations happen via websockets
    });
  },

  setGameData(data) {
    var players = [0,1,2,3].map(position => {
      if(position !== data.position) {
        return {
          name: data.playerNames[position],
          position,
          handSize: 0,
          bonus: [],
          revealed: []
        };
      }
      return false;
    });
    this.setState({ currentGame: data, players });
  },

  setInitialTiles(tiles) {
    var players = this.state.players;
    players.map(player => {
      if(player.position !== this.state.currentGame.position) {
        player.handSize = tiles.length;
      }
    });
    this.setState({ players });
  },

  addTile(tile, wallSize) {
    this.setState({ drawtile: tile });
  },

  setTilesPriorToDiscard(tiles, bonus, revealed) {
    this.setState({ currentDiscard: false, tiles, bonus, revealed, discarding:true });
  },

  discard(evt) {
    var tile = parseInt(evt.target.getAttribute('data-tile'));
    var tiles = this.state.tiles;
    var pos = tiles.indexOf(tile);
    tiles.splice(pos,1);
    this.setState({
      drawtile: false,
      discarding: false
    }, () => {
      tiles,
      this.state.client.processTileDiscardChoice(tile);
    });
  },

  determineClaim(from, tile, sendClaim) {
    this.setState({
      currentDiscard: { from, tile, sendClaim }
    });
  },

  ignoreClaim() {
    var claim = { claimType: Constants.NOTHING };
    this.state.currentDiscard.sendClaim(claim);
    this.setState({ currentDiscard: false });
  },

  getClaim() {
    this.setState({ claiming: true });
  },

  sendClaim(claimType, winType) {
    this.state.currentDiscard.sendClaim({ claimType, winType});
    this.setState({ claiming: false });
  },

  tileClaimed(tile, by, claimType, winType) {
    this.setState({ currentDiscard: false });
  },

  recordReveal(playerPosition, tiles) {
    var players = this.state.players;
    var player = players[playerPosition];
    player.handSize = Math.max(player.handSize - 3, 0);
    player.revealed.push(tiles);
    this.setState({ players });
  },

  recordBonus(playerPosition, tiles) {
    if (playerPosition === this.state.currentGame.position) return;
    var players = this.state.players;
    var player = players[playerPosition];
    player.bonus = player.bonus.concat(tiles);
    this.setState({ players });
  },

  handDrawn(acknowledged) {
    alert("hand was a draw");
    acknowledged();
  },

  handWon(winner, selfdrawn, acknowledged) {
    var player = this.state.players[winner];
    alert("hand was won by "+player.name);
    acknowledged();
  }
});

ReactDOM.render(<ClientApp/>, document.getElementById('client'));
