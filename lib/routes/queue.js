var express = require('express');
var router = express.Router();
var Promise = require('bluebird');
var Queue = require('../models/queue');
var Job = require('../models/job');

router.all('/', function(req, res) {
  var qName = req.query.name;
  Queue.exists(qName).then(function(result) {
    if (!result) {
      res.json({
        status: 'FAIL',
        message: 'The queue does not exist.'
      });
      return
    }
    Promise.join(
      Queue.total(qName),
      Job.total(qName, 'wait'),
      Job.total(qName, 'active'),
      Job.total(qName, 'delayed'),
      Job.total(qName, 'completed'),
      Job.total(qName, 'failed')
    ).then(function(results) {
      var jobData = {
        total: results[0],
        wait: results[1],
        active: results[2],
        delayed: results[3],
        completed: results[4],
        failed: results[5]
      };
      res.json({
        status: 'OK',
        queue: {
          name: qName,
          stats: jobData
        }
      });
    });
  })
});

router.all('/list', function(req, res) {
  Queue.list().then(function(queues) {
    res.json({
      status: 'OK',
      queues: queues
    });
  }).catch(function(err) {
    console.log(err.stack);
    res.json({
      status: 'FAIL',
      message: err.message
    });
  });
});

module.exports = router;
