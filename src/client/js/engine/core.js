// Engine core
//
// The Engine class coordinates modules that handle different aspects of
// gameplay (e.g. game state, rendering, AI).  Modules can register
// themselves with the engine and receive events or state updates.  This
// engine does not impose a rendering strategy; it simply dispatches
// events and state changes to its modules.

export default class Engine {
  constructor() {
    this.modules = [];
  }

  /**
   * Register a module with the engine.  A module is an object that
   * optionally implements `init(engine)`, `onEvent(event, data)`, and
   * `update(state)`.  The engine will call these methods at appropriate
   * times.
   * @param {object} mod
   */
  registerModule(mod) {
    this.modules.push(mod);
    if (typeof mod.init === 'function') {
      mod.init(this);
    }
  }

  /**
   * Broadcast an event to all modules.  Modules can use this to react to
   * actions, network events, etc.
   * @param {string} event
   * @param {any} data
   */
  broadcast(event, data) {
    for (const mod of this.modules) {
      if (typeof mod.onEvent === 'function') {
        mod.onEvent(event, data);
      }
    }
  }

  /**
   * Update modules with new state.  When the server sends an updated
   * game state, call this method to inform all modules so they can
   * reconcile their own state.
   * @param {object} state
   */
  update(state) {
    for (const mod of this.modules) {
      if (typeof mod.update === 'function') {
        mod.update(state);
      }
    }
  }
}