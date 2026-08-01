// usecases/GameStateMachine.js
import { GameState } from '../domain/GameState.js';

export class GameStateMachine {
  constructor() {
    this._state = GameState.LOADING;
    this._listeners = {}; // { 'PLAYING_ENTER': [fn, ...], ... }
  }

  get current() {
    return this._state;
  }

  on(event, fn) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(fn);
  }

  _emit(event, payload) {
    (this._listeners[event] ?? []).forEach(fn => fn(payload));
  }

  // Valid transitions — REQ-GSM-001 / REQ-GSM-002
  get _TRANSITIONS() {
    return {
      [GameState.LOADING]: [GameState.MAIN_MENU],
      [GameState.MAIN_MENU]: [GameState.PLAYING],
      [GameState.PLAYING]: [GameState.PAUSED, GameState.GAME_OVER],
      [GameState.PAUSED]: [GameState.PLAYING],
      [GameState.GAME_OVER]: [GameState.MAIN_MENU, GameState.PLAYING],
    };
  }

  transition(to) {
    const allowed = this._TRANSITIONS[this._state] ?? [];
    if (!allowed.includes(to)) {
      console.warn(`Invalid transition ${this._state} → ${to}`);
      return false;
    }
    this._emit(`${this._state}_EXIT`);
    this._state = to;
    this._emit(`${to}_ENTER`);
    return true;
  }
}
