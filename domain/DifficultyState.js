// domain/DifficultyState.js

/**
 * @typedef {Object} DifficultyState
 * @property {number} pipeSpeed          - Current runtime pipe scroll speed (px/s)
 * @property {number} gapHeightMin       - Current minimum gap size (px)
 * @property {number} gapHeightMax       - Current maximum gap size (px)
 * @property {number} pipeSpacing        - Current pipe horizontal spacing (px)
 * @property {number} pipesPassed        - Pipes-Passed Counter (physical obstacles)
 * @property {number} singleGapCounter   - Count toward next Double-Gap threshold
 * @property {number} doubleGapThreshold - N from [3,7], randomized each cycle
 * @property {boolean} thirdAxisActive   - Whether third difficulty axis is unlocked
 * @property {number}  slowTimeTimer     - Remaining SLOW_TIME duration (s), 0 = off
 * @property {number}  slowTimeBaseSpeed - Speed at SLOW_TIME activation (for restore)
 */
