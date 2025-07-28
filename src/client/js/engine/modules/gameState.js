// GameState module
//
// This module keeps a local copy of the game state received from the server.
// It exposes methods to query the state (players, log, etc.).  You can
// extend this class with computed properties, caching, or derived values.

export default class GameState {
  constructor() {
    this.state = null;
  }

  /**
   * Initialise the module.  Called once when the module is registered
   * with the engine.  You can use this to set up internal data or
   * subscribe to engine events.  The engine is passed as a parameter.
   * @param {import('../core.js').default} engine
   */
  init(engine) {
    this.engine = engine;
  }

  /**
   * Update the local state with a new state from the server.
   * @param {object} state
   */
  update(state) {
    this.state = state;
  }

  /**
   * Optional event handler.  This module does not use events yet.
   */
  onEvent(_event, _data) {}

  /**
   * Get the current list of players.  Returns an empty array if no
   * state has been received yet.
   */
  get players() {
    return (this.state && this.state.players) || [];
  }

  /**
   * Get the game log.  Returns an empty array if no state.
   */
  get log() {
    return (this.state && this.state.log) || [];
  }

  /**
   * Get the list of monsters currently in the game.  Returns an empty
   * array if the state has no monsters.
   */
  get monsters() {
    return (this.state && this.state.monsters) || [];
  }
}