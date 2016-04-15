var React = require('react');
var $ = require('jquery');

ToureiroSidebar = React.createClass({

  pollTimer: undefined,

  getInitialState: function() {
    var state = {
      db: [0,1,2,3,4,5,6,7,8,9,10],
      queues: [],
      queue: undefined,
      category: undefined
    };
    return state;
  },

  componentDidMount: function() {
    var _this = this;
    this.listQueues();
    this.pollTimer = setInterval(function() {
      _this.listQueues();
      if (_this.state.queue) {
        _this.getQueue(_this.state.queue.name);
      }
    }, 2000);
  },

  listQueues: function() {
    var _this = this;
    $.get('queue/list/', function(response) {
      if (response.status === 'OK') {
        _this.setState({
          queues: response.queues
        })
        if (!_this.state.queue && response.queues.length > 0) {
          _this.getQueue(response.queues[0]);
        }
      } else {
        console.log(response);
      }
    });
  },

  getQueue: function(queue) {
    var _this = this;
    $.get('queue/?name=' + encodeURIComponent(queue), function(response) {
      if (response.status === 'OK') {
        var state = {
          queue: response.queue,
        };
        if (!_this.state.queue) {
          stats = response.queue.stats;
          category = 'active';
          if (stats['active'] > 0) {
            category = 'active';
          } else if (stats['wait'] > 0) {
            category = 'wait';
          } else if (stats['delayed'] > 0) {
            category = 'delayed';
          } else if (stats['completed'] > 0) {
            category = 'completed';
          } else if (stats['failed'] > 0) {
            category = 'failed';
          }
          state.category = category;
          if (_this.props.onQueueChange) {
            _this.props.onQueueChange(queue);
            _this.props.onCategoryChange(category);
          }
        }
        _this.setState(state);
      } else {
        console.log(response);
      }
    });
  },

  changeDb: function(event) {
    var _this = this;
    var db = $(event.target).val();
    $.get('db/?db=' + encodeURIComponent(db), function(response) {
      if (response.status === 'OK') {
        console.log("Response OK");
      } else {
        console.log(response);
      }
    });
  },

  changeQueue: function(event) {
    console.log("DEBUG: Change queue");
    var _this = this;
    var queue = $(event.target).val();
    this.getQueue(queue);
    if (_this.props.onQueueChange) {
      _this.props.onQueueChange(queue);
    }
  },

  changeCategory: function(key, event) {
    var _this = this;
    this.setState({
      category: key
    }, function() {
      if (_this.props.onCategoryChange) {
        _this.props.onCategoryChange(key);
      }
    });
  },

  render: function() {
    var _this = this;
    return (
      <div id="toureiro-sidebar">
        <h4 className="header">Toureiro</h4>
        <div name="db" onChange={this.changeDb} id="sidebar-dbs">
          <h5>Select db:</h5>
          <select className="form-control">
            {
              this.state.db.map(function(dbNumber) {
                return (
                  <option value={dbNumber} key={dbNumber}>db-{dbNumber}</option>
                );
              })
            }
          </select>
        </div>
        <div id="sidebar-queues">
          <h5>Select Queue:</h5>
          <select name="queue" onChange={this.changeQueue} className="form-control">
          {
            this.state.queues.map(function(queue) {
              return (
                <option value={queue} key={queue}>{queue}</option>
              );
            })
          }
          </select>
        </div>
        <div id="sidebar-stats">
          <h5>Job Status</h5>
          {
            (_this.state.queue) ? (
              ['active', 'wait', 'delayed', 'completed', 'failed'].map(function(key) {
                return (
                  <div key={key} className="sidebar-stat">
                    <a href="javascript:;" onClick={_this.changeCategory.bind(_this, key)}>
                      {key[0].toUpperCase() + key.slice(1)} : <span className="badge">{_this.state.queue.stats[key]}</span>
                    </a>
                  </div>
                );
              })
            ) : ''
          }
          <div className="sidebar-stat">
            <a href="javascript:;" onClick={_this.changeCategory.bind(_this, 'job')}>Job Details</a>
          </div>
        </div>
        <div className="sidebar-controls">
          <div>
            <input id="readonly" type="checkbox" name="readonly" checkedLink={this.props.readonlyLink} />  <label htmlFor="readonly">ReadOnly</label>
          </div>
        </div>
      </div>
    );
  }

});

module.exports = ToureiroSidebar;
