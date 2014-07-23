var MongoClient = require('mongodb').MongoClient;
var aggregateReduce = require('../')();

MongoClient.connect('mongodb://192.168.111.222:27017/arTest',{}, function (err, db) {
  if (err) return console.error(err);

  // Let's create a test data set and insert 1K rows
  var col = db.collection('test');

  var i = 0;

  ;(function insert(){
    var d = new Date(2014, Math.round(Math.random() * 11 +1), Math.round(Math.random() * 30 +1))
    var obj = {
      date: d,
      rand: Math.round(Math.random()*100),
      timestamp: new Date().getTime()
    }

    col.insert(obj, function (err) {
      if (err) {console.error(err); return db.close();}
      console.log('inserted', obj)

      if (++i < 1000) return insert();

      console.log('done');
      var map = function () {emit(this._id, this)};
      var reduce = function (key, values) {
        var obj = values[0];
        for (var i=1; i<values.length; ++i) {
          obj.count = (obj.count || 0) + values[i].count;
          obj.sum = (obj.sum || 0) + values[i].sum;
          obj.timestamp = obj.timestamp > values[i].timestamp ? obj.timestamp : values[i].timestamp;
        }
        return obj;
      }

      aggregateReduce(col,[
        {$group:{
          _id:{month:{$month: '$date'}, day:{$dayOfMonth:'$date'}},
          count: {$sum: 1},
          sum: {$sum: '$rand'},
          timestamp: {$max: '$timestamp'}
        }}
      ],map, reduce, {out:{reduce: 'tstReduce'}, cutoff: 20}, function (err, col) {
        if(err) return console.error(err);
        col.find().stream().on('data', console.log);
      })
    })
  })();
});