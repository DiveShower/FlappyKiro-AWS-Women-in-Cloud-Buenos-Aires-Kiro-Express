// usecases/ports/IStoragePort.js

export class IStoragePort {
  loadHighScore() {
    throw new Error('not implemented');
  }

  saveHighScore(n) {
    throw new Error('not implemented');
  }

  loadMuteState() {
    throw new Error('not implemented');
  }

  saveMuteState(b) {
    throw new Error('not implemented');
  }
}
