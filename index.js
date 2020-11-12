
"use strict";

const qs = require('qs');
const request = require('request');
const deepmerge = require('deepmerge');
const Magento2 = require('node-magento2');

const defaultOptions = {
  url: 'https://indomagento.cf/public/node/',
  store: 'default',
  userAgent: 'Fabacus Magento 2 Library',
  authentication: {
    login: {
      type: 'admin',
      username: "admin",
      password: "1532587Adova"
    },
    integration: {
      consumer_key: "mosorz1t5zck238jb2lebxirtebqgdqo",
      consumer_secret: "b7jvkk0ffddr045e2ekpm9aa865n2u9b",
      access_token: "wxhsqk14wor3ednr5np9l1t7s7vi45o0",
      access_token_secret: "6s8xsfq2soypal7euv6weeazl03sei5k"
    }
  }
}

class MagentoTwo {
  constructor(url, options) {
    if(typeof url != 'string') {
      options = url;
      url = options.url;
    }
    options.url = url;
    this.baseUrl = url;
    this.options = deepmerge(defaultOptions, options);
    this.rootPath = 'rest/'+this.options.store;
    this.authKey = false;
  }

  init() {
    return new Promise((resolve, reject) => {
      this._initHelpers();
      if(this.options.authentication.login.username) {
        let path;
        if(this.options.authentication.login.type == 'admin') {
          path = '/V1/integration/admin/token'
        } else {
          path = '/V1/integration/customer/token'
        }
        this.post(path, {username: this.options.authentication.login.username, password: this.options.authentication.login.password})
          .then(token => {
            this.authKey = token;
            resolve(this);
          })
          .catch(e => {
            reject(e);
          });
      } else if(this.options.authentication.integration.access_token) {
        this.authKey = this.options.authentication.integration.access_token;
      }
      resolve(this);
    });
  }

  _initHelpers() {
    this.module = require('./lib/module')(this);
    this.bundleProduct = require('./lib/bundleProduct')(this);
    this.configProduct = require('./lib/configProduct')(this);
    this.catalog = require('./lib/catalog')(this);
    this.sales = require('./lib/sales')(this);
    this.customers = require('./lib/customers')(this);
  }

  get(path, params) {
    return this._send(path, 'GET', params);
  }

  delete(path, params) {
    return this._send(path, 'DELETE', params);
  }

  post(path, params, data) {
    if(!data) {
      data = params;
      params = null;
    }
    return this._send(path, 'POST', params, data);
  }

  put(path, params, data) {
    if(!data) {
      data = params;
      params = null;
    }
    return this._send(path, 'PUT', params, data);
  }

  _send(url, method, params, data, options) {
    let uri = [this.baseUrl,this.rootPath,url].join('/').replace(/\/\//g,'/').replace(':/', '://');

    //check if there's any missing parameters
    let missingFields = uri.match(/(\{[a-zA-Z0-9_]+\})/g)
    if(missingFields && missingFields.length > 0) {
      return Promise.reject('URL missing parameters: '+missingFields.join(", "));
    }

    let headers = {}
    headers['User-Agent'] = this.options.userAgent;
    headers['Content-Type'] = 'application/json';
    if(this.authKey) {
      headers.Authorization = 'Bearer '+this.authKey;
    }
    return new Promise((resolve, reject) => {
      request({
        uri: uri,
        method: method,
        headers: headers,
        rejectUnauthorized: false,
        qs: params,
        body: JSON.stringify(data)
      }, (err, response, body) => {
        if(err) reject(err);
        let returnValue = body;
        try {
          returnValue = JSON.parse(returnValue);
        } catch(e) {
          return reject(e);
        }

        //success if the code is a 200 type
        if(response.statusCode >= 200 && response.statusCode < 300) {
          return resolve(returnValue);
        }

        //otherwise fail it :)
        if(returnValue.parameters) {
          reject(this._format(returnValue.message, returnValue.parameters, '%{key}'));
        } else {
          reject(returnValue.message);
        }
      })
    })
  }

  _format(url, replace, replaceTemplate) {
    replaceTemplate = replaceTemplate || '{{key}}';
    for(let key of Object.keys(replace)) {
      let replaceVal = replace[key];
      let replaceKey = replaceTemplate.replace('{key}', key);
      if(typeof replaceVal == 'undefined') {
        throw new Error('Missing url parameter: '+replaceKey);
      }
      url = url.replace(replaceKey, replace[key]);
    }
    return url;
  }
}


//instantiate the client object
const options = {
  authentication: {
    integration: {
      access_token: 'wxhsqk14wor3ednr5np9l1t7s7vi45o0'
    }
  }
}

const mageClient = new Magento2('https://indomagento.cf/public/node/', options)
mageClient.init();

//basic usage
mageClient.get('/V1/products', {searchCriteria: 'pageSize=2'} ) //Get a list of all products
  .then(products => {
    console.log(products);
  });




module.exports = MagentoTwo;
