'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
/**
 * 一个
 *
 */
function createInstance(defaultConfig) {
  console.log('defaultConfig', defaultConfig);

  var context = new Axios(defaultConfig);
  console.log(Axios);

  console.log('context', context);
  console.log(Axios.prototype);

  // bind(fn,context)
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);
  console.log('instance', instance);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}
console.log('11');

// Create the default instance to be exported
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;
console.log('======');

console.log(axios);

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  console.log('create');

  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
// 注册取消机制
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');

module.exports = axios;

// Allow use of default import syntax in TypeScript
module.exports.default = axios;
