// usecases/ports/IInputPort.js

export class IInputPort {
  consumeFlapIntent() {
    throw new Error('not implemented');
  }

  consumePauseIntent() {
    throw new Error('not implemented');
  }

  consumeMuteIntent() {
    throw new Error('not implemented');
  }
}
