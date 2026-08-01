// domain/Pipe.js

/**
 * @typedef {Object} Pipe
 * @property {string}   id          - Unique identifier
 * @property {number}   x           - Left edge position (px), mutable as pipe scrolls
 * @property {Object}   rarity      - PipeRarity object
 * @property {'SINGLE'|'DOUBLE'} gapType
 * @property {Array}    gaps        - Length 1 (Single) or 2 (Double)
 * @property {boolean}  passed      - true once Ghosty's trailing edge has cleared the pipe
 * @property {number}   driftPhase  - Phase offset (radians) for third-axis Y drift
 */
