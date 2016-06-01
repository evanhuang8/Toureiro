var Queue = require('bull');
var express = require('express');
var toureiro = require('../');


var app = express();
app.use('/', toureiro({redis: {}, development: true}));
var server = app.listen(3001, function() {
  console.log('Toureiro Server is now listening at port 3001...');
});