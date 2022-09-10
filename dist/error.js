"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.instanceOfNodeError = void 0;
// temporary solution to avoid the error
function instanceOfNodeError(value, errorType) {
    return value instanceof errorType;
}
exports.instanceOfNodeError = instanceOfNodeError;
