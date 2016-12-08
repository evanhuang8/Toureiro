var _ = require('lodash');
var bull = require('bull');
var chai = require('chai');
var expect = chai.expect;
var Promise = require('bluebird');
var Redis = require('ioredis');
var uuid = require('node-uuid');

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

describe('Models', function() {

  before(function() {
    require('../lib/redis').init({});
  });

  describe('Queue', function() {

    var Queue = require('../lib/models/queue');

    beforeEach(function() {
      return resetData();
    });

    it('#list()', function() {
      return Queue.list().then(function(keys) {
        expect(keys).to.be.a('array');
        expect(keys.length).to.equal(6);
      })
    });

    it('#total()', function() {
      return Queue.total('test queue').then(function(total) {
        expect(parseInt(total)).to.equal(20);
      })
    });

    it('#remove()', function() {
      return Queue.remove('test queue').then(function() {
        return client.keys('bull:test queue:*').then(function(keys) {
          expect(keys.length).to.equal(0);
        });
      });
    });

  });

  describe('Job', function() {

    var Job = require('../lib/models/job');

    it('#get()', function() {
      return buildQueue('job').then(function() {
        return Job.get('job', 1).then(function(job) {
          expect(job).to.exist;
          expect(job.jobId).to.equal(1);
        });
      });
    });

    it('#remove()', function() {
      return buildQueue('job').then(function() {
        return Job.remove('job', 1).then(function() {
          return Job.get('job', 1).then(function(job) {
            expect(job).to.not.exist;
          });
        });
      });
    });

    describe('`wait`', function() {

      beforeEach(function() {
        return cleanSlate().then(function() {
          return buildQueue('wait');
        });
      });

      it('#total()', function() {
        return Job.total('wait', 'wait').then(function(total) {
          expect(total).to.equal(20);
        });
      });

      it('#fetch()', function() {
        return Job.fetch('wait', 'wait', 5, 7).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(7);
          // ids are reversed since it's LIFO
          var ids = [15, 14, 13, 12, 11, 10, 9];
          _.map(jobs, function(job) {
            expect(ids.indexOf(Number(job.jobId))).to.not.equal(-1);
          });
        });
      });

    });

    describe('`active`', function() {

      beforeEach(function() {
        return cleanSlate().then(function() {
          return buildQueue('active').then(function(q) {
            Promise.join(
              q.getNextJob(),
              q.getNextJob(),
              q.getNextJob(),
              q.getNextJob(),
              q.getNextJob()
            )
          });
        });
      });

      it('#total()', function() {
        return Job.total('active', 'active').then(function(total) {
          expect(total).to.equal(5);
        });
      });

      it('#fetch()', function() {
        return Job.fetch('active', 'active', 1, 3).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(3);
          var ids = [2, 3, 4];
          _.map(jobs, function(job) {
            expect(ids.indexOf(Number(job.jobId))).to.not.equal(-1);
          });
        });
      });

    });

    describe('`delayed`', function() {

      beforeEach(function() {
        return cleanSlate().then(function() {
          var q = createQueue('delayed');
          var promises = [];
          var i;
          for (i = 0; i < 10; i++) {
            promises.push(q.add({
              foo: 'bar'
            }, {
              delay: 1000 + i * 10
            }));
          }
          return Promise.all(promises);
        });
      });

      it('#total()', function() {
        return Job.total('delayed', 'delayed').then(function(total) {
          expect(total).to.equal(10);
        });
      });

      it('#fetch()', function() {
        return Job.fetch('delayed', 'delayed', 0, 4).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(4);
          var ids = [1, 2, 3, 4];
          _.map(jobs, function(job) {
            expect(ids.indexOf(Number(job.jobId))).to.not.equal(-1);
          });
        });
      });

    });

    describe('`completed`', function() {

      var q;

      beforeEach(function(done) {
        cleanSlate().then(function() {
          buildQueue('completed').then(function(_q) {
            q = _q;
            q.process(function(job) {});
            setTimeout(function() {
              done();
            }, 100);
          });
        });
      });

      it('#total()', function() {
        return Job.total('completed', 'completed').then(function(total) {
          expect(total).to.equal(20);
        });
      });

      it('#fetch()', function() {
        return Job.fetch('completed', 'completed', 1, 5).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(5);
          var ids = [2, 3, 4, 5, 6];
          _.map(jobs, function(job) {
            expect(ids.indexOf(Number(job.jobId))).to.not.equal(-1);
          });
        });
      });

    });

    describe('`failed`', function() {

      var q;

      beforeEach(function(done) {
        cleanSlate().then(function() {
          buildQueue('failed').then(function(_q) {
            q = _q;
            q.process(function(job) {
              throw new Error('Doomed!');
            });
            setTimeout(function() {
              done();
            }, 100);
          });
        });
      });

      it('#total()', function() {
        return Job.total('failed', 'failed').then(function(total) {
          expect(total).to.equal(20);
        });
      });

      it('#fetch()', function() {
        return Job.fetch('failed', 'failed', 3, 7).then(function(jobs) {
          expect(jobs).to.be.an('array');
          expect(jobs.length).to.equal(7);
          var ids = [4, 5, 6, 7, 8, 9, 10];
          _.map(jobs, function(job) {
            expect(ids.indexOf(Number(job.jobId))).to.not.equal(-1);
          });
        });
      });

    });

  });

});
