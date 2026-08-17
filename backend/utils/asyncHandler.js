// Wraps an async Express route handler so that any rejected promise (e.g. a database
// call that fails due to a network blip) is passed to next(err) instead of becoming an
// unhandled promise rejection — which would otherwise crash the entire Node process.
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;