var _ = require('lodash');
var bull = require('bull');
var chai = require('chai');
var expect = chai.expect;
var Promise = require('bluebird');
var Redis = require('ioredis');
var uuid = require('node-uuid');
var request = require('supertest');

var client = new Redis();

function cleanSlate() {
  return client.keys('bull:*').then(function(keys) {
    if (keys.length) {
      return client.del(keys);
    }
  });
}

function createQueue(name) {
  return new bull(name);
}

function buildQueue(name) {
  var q = createQueue(name ? name : uuid());
  var promises = [];
  var i;
  for (i = 0; i < 20; i++) {
    promises.push(q.add({
      foo: 'bar'
    }));
  }
  return Promise.all(promises).return(q);
}

function resetData() {
  return cleanSlate().then(function() {
    var promises = [];
    var i;
    for (i = 0; i < 5; i++) {
      promises.push(buildQueue());
    }
    promises.push(buildQueue('test queue'));
    return Promise.all(promises);
  });
}

var Toureiro = require('../lib/toureiro');
var Queue = require('../lib/models/queue');
var Job = require('../lib/models/job');

var app = Toureiro({
  redis: {
    db: 7
  }
});

describe('Server', function() {

  describe('Rerun Job', function() {

    describe('Completed', function() {

      var q;

      beforeEach(function(done) {
        cleanSlate().then(function() {
          buildQueue('rerun-completed').then(function(_q) {
            q = _q;
            q.process(function(job) {});
            setTimeout(function() {
              done();
            }, 1000);
          });
        });
      });

      it('should be able to rerun completed jobs', function(done) {
        Job.fetch('rerun-completed', 'completed', 0, 1).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(1);
          var job = jobs[0];
          request(app)
            .post('/job/rerun')
            .set('Accept', 'application/json')
            .send({
              queue: 'rerun-completed',
              id: job.jobId
            })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                done(err);
                return
              }
              expect(res.body.status).to.equal('OK');
              expect(res.body.job).to.exist;
              expect(res.body.job.id).to.not.equal(job.jobId);
              setTimeout(function() {
                Job.get('rerun-completed', res.body.job.id).then(function(job) {
                  expect(job).to.exist;
                  expect(job.state).to.equal('completed');
                  done();
                });
              }, 500);
            });
        });
      });

    });

    describe('Failed', function() {

      var q;

      beforeEach(function(done) {
        cleanSlate().then(function() {
          buildQueue('rerun-failed').then(function(_q) {
            q = _q;
            q.process(function(job) {
              if (job.jobId <= 20) {
                throw new Error('doomed!');
              }
            });
            setTimeout(function() {
              done();
            }, 1000);
          });
        });
      });

      it('should be able to rerun failed jobs', function(done) {
        Job.fetch('rerun-failed', 'failed', 0, 1).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(1);
          var job = jobs[0];
          request(app)
            .post('/job/rerun')
            .set('Accept', 'application/json')
            .send({
              queue: 'rerun-failed',
              id: job.jobId
            })
            .expect(200)
            .end(function(err, res) {
              if (err) {
                done(err);
                return
              }
              expect(res.body.status).to.equal('OK');
              expect(res.body.job).to.exist;
              expect(res.body.job.id).to.not.equal(job.jobId);
              setTimeout(function() {
                Job.get('rerun-failed', res.body.job.id).then(function(job) {
                  expect(job).to.exist;
                  expect(job.state).to.equal('completed');
                  done();
                });
              }, 500);
            });
        });
      });

    });

  });

});
