var fs = require('fs');
var d3 = require('d3');
var jsdom = require('jsdom');
var mysql      = require('mysql');

var arg = process.argv[2];

console.log(arg);


var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'yovalue',
  password : '',
  database : 'yovalue'
});

connection.connect();

connection.query('SELECT * from graph LIMIT 2', function(err, rows, fields) {
  if (!err)
    console.log('The solution is: ', rows);
  else
    console.log('Error while performing Query.');
});

connection.end();
