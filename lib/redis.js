var _ = require('lodash');
var Redis = require('ioredis');

module.exports = {

  // Redis client instance
  _client: undefined,

  // Redis connection options
  redisOpts: undefined,

  /**
   * Initialize redis client
   * @param {Object} opts Options for creating the redis client
   */
  init: function(opts) {
    opts = _.extend({
      keyPrefix: 'bull'
    }, opts)
    this._client = new Redis(opts);
    this.redisOpts = opts;
  },

  /**
   * Get redis client
   * @returns {Object} Redis client instance
   */
  client: function() {
    return this._client;
  },

  /**
   * Get a redis multi interface
   * @returns {Object} Redis multi interface
   */
  multi: function() {
    var multi = this._client.multi();
    return multi;
  }

};
