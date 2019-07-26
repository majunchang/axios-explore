### axios源码分析

##### axios调用方法

```js
const axios = require('axios');

// 第一种
axios({
  url,
  method,
  headers,
})

//  第二种

axios(url, {
  method,
  headers,
})


//  第三种


axios.get(url, {
  headers,
})


//  第四种

axios.post(url, data, {
  headers,
})

// 第五种

axios.request({
  url,
  method,
  headers,
})



```

##### axios 内部流程图

![img](https://user-gold-cdn.xitu.io/2018/5/28/163a57520cfeb580?imageslim)

### axios流程 解析

##### 入口文件

```js
'use strict';

var utils = require('./utils');
var bind = require('./helpers/bind');
var Axios = require('./core/Axios');
var mergeConfig = require('./core/mergeConfig');
var defaults = require('./defaults');

/**
 * Create an instance of Axios
 * 创建axios实例
 */
function createInstance(defaultConfig) {
 
  var context = new Axios(defaultConfig);  // context为Axios实例  
  // bind(fn,context)
  // context  ：   Axios {defaults: {…}, interceptors: {…}}
  // var instance = Axios.prototype.request.bind(context);
  // instance 指向request方法 上下文指向context  ===> instance(option)方式调用
  // Axios.prototype.request 对于第一个参数的数据类型判断 ===> instance(url，option)方式调用
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  // Axios.prototype上的方法扩展到instance对象上 instance具有get post等方法  制定上下文为context
  // Axios.prototype: { request: ƒ, getUri: ƒ, delete: ƒ, get: ƒ, head: ƒ, … }
  utils.extend(instance, Axios.prototype, context);
  
  
  // Copy context to instance
  // instance 就有了defaults、interceptors 属性
  utils.extend(instance, context);
  return instance;
}


// Create the default instance to be exported  创建新的axios实例
var axios = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios.Axios = Axios;


// Factory for creating new instances
// 工厂函数 根据配置创造新的实例
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
// 注册取消机制
axios.Cancel = require('./cancel/Cancel');
axios.CancelToken = require('./cancel/CancelToken');
axios.isCancel = require('./cancel/isCancel');

// Expose all/spread  all和spread两个处理并行的静态方法
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = require('./helpers/spread');


module.exports = axios;
// Allow use of default import syntax in TypeScript
module.exports.default = axios;

```

##### 入口文件解析

-  instance(option)  如何转化为request方法

```js
var instance = bind(Axios.prototype.request, context); 
var instance = Axios.prototype.request.bind(context);
instance({
        method: "get",
        url: url
      }).then(res => {
        console.log(res);
 });

bind:
module.exports = function bind(fn, thisArg) {
   //  fn:   指Axios中的Axios.prototype.request 
   //  thisArg 就是context  就是Axios {defaults: {…}, interceptors: {…}}
  return function wrap() {
   	// arguments [{url,method:'get'}，callee:()....]
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

```

-  instance(url，option)如何转化为request方法

```js
var instance = bind(Axios.prototype.request, context); 
var instance = Axios.prototype.request.bind(context);

 instance.get(url, {
          params: "花好动漫"
        })
        .then(res => {
          console.log(res);
        });
    }
    
bind:
module.exports = function bind(fn, thisArg) {
   //  fn:   指Axios中的Axios.prototype.request 
   //  thisArg 就是context  就是Axios {defaults: {…}, interceptors: {…}}
  return function wrap() {
   	// arguments [url,{params:'花好动漫'}，callee:()....]
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};  

utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function (url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});
```

##### Axios.prototype.request

```js
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  // instance 入口传入的参数
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}


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
         
      使用时：
           // Add a request interceptor
          axios.interceptors.request.use(function (config) {
            // Do something before request is sent
            return config;
          }, function (error) {
            // Do something with request error
            return Promise.reject(error);
          });
  */
  // 先加入的后执行
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });
  // 先加入的先执行
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
```

##### 拦截器的执行流程图

![](<https://pic4.zhimg.com/80/v2-6075b1ceb55311820cac33da4334a92f_hd.jpg>)

##### dispatchRequest

1. 拿到config对象，在传给http请求前做最后的处理
2. http请求根据config配置 发起请求
3. http请求成功之后 对数据进行转化 然后return

```js
module.exports = function dispatchRequest(config) {
  //  取消机制
  throwIfCancellationRequested(config);

	.....

  // Ensure headers exist
  config.headers = config.headers || {};
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  // 删除header中的无用属性
  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};
```

##### adapter中的onAdapterResolution

- 调用throwIfCancellationRequested 来判断请求是否被取消(axios中可以通过cancelToken取消请求)，如果请求已经被手动取消则会抛出一个异常
- 调用transformResponse对服务返回的数据进行处理，一般进行解密解码等操作
- 返回之后的response

##### axios取消机制

###### 使用方法

```js
 let cancelToken = axios.CancelToken;
      let source = cancelToken.source();
      axios({
        method: "get",
        url: url,
        cancelToken: source.token
      })
        .then(res => {
          console.log(res);
        })
        .catch(err => {
          if (axios.isCancel(err)) {
            console.log("取消请求传递的消息", err.message);
          } else {
            console.log(err);
          }
        });

source.cancel("取消请求的这条消息");
```



```javascript
// 引入部分 

var axios = createInstance(defaults);
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



/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    // 手动抛出一个异常
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};  
```

#### adapter是什么

> adapter是一个典型的适配器模式的实现 ,内部对于不同环境做了适配处理，封装了统一的行为：根据config发送请求然后返回一个promise，promise的状态由请求的结果来决定

```javascript
function getDefaultAdapter() {
  var adapter;
  // Only Node.JS has a process variable that is of [[Class]] process
  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = require('./adapters/http');
  } else if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = require('./adapters/xhr');
  }
  return adapter;
}
```

##### http请求完成后到达用户的顺序流

![image.png](https://upload-images.jianshu.io/upload_images/5703029-c01cbdca52e7cfd0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)



##### axios  修改全局的转换器

```javascript
import axios from 'axios'

// 往现有的请求转换器里增加转换方法
axios.defaults.transformRequest.push((data, headers) => {
  // ...处理data
  return data;
});

// 重写请求转换器
axios.defaults.transformRequest = [(data, headers) => {
  // ...处理data
  return data;
}];

// 往现有的响应转换器里增加转换方法
axios.defaults.transformResponse.push((data, headers) => {
  // ...处理data
  return data;
});

// 重写响应转换器
axios.defaults.transformResponse = [(data, headers) => {
  // ...处理data
  return data;
}];


```

#### axios 总体流程图

![](<https://pic2.zhimg.com/v2-a35d475ecf0d4ad1029551214a70bca9_r.jpg>)