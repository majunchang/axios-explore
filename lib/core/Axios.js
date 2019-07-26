'use strict';

var utils = require('./../utils');
var buildURL = require('../helpers/buildURL');
var InterceptorManager = require('./InterceptorManager');
var dispatchRequest = require('./dispatchRequest');
var mergeConfig = require('./mergeConfig');

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  console.log('instanceConfig', instanceConfig);

  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}
console.log('Axios.prototype');

console.log(Axios.prototype);

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  console.log('config', config);

  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }
  // 将this.defaults 与config对象进行合并   默认请求方法是get
  config = mergeConfig(this.defaults, config);
  config.method = config.method ? config.method.toLowerCase() : 'get';

  // Hook up interceptors middleware
  // chain数组是用来盛放拦截器和dispatchRequest方法的 通过promise从chain数组中 按序取出回调函数逐一执行
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  /** *
             通过use进行声明使用的  会被添加进来
             InterceptorManager.prototype.use = function use(fulfilled, rejected) {
                  this.handlers.push({
                      fulfilled: fulfilled,
                      rejected: rejected
                  });
              return this.handlers.length - 1;
              };
             */
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });
  /**
         * http://www.axios-js.com/docs/  Interceptors的使用
         * 通过对于request和response的forEach操作
         * chain数组
         * [requestFulfilledFn,requestRejectFn
         *  dispatchRequest,undefined]
         * reponseFulfilledFn,requestRejectFn]
         *
         */

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};


/** *
 *  通过这两个utils中的forEach遍历  我们就可以通过多种方式发起http请求
 */
// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    console.log('prototype内部');

    console.log(url)
    console.log(config);

    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

module.exports = Axios;
