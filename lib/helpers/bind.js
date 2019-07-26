'use strict';

module.exports = function bind(fn, thisArg) {
  console.log('thisArg');
  console.log(fn);

  console.log(thisArg);

  return function wrap() {
    console.log('arguments');

    console.log(arguments);

    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};
