# incremental-ar

Incremental aggregate-reduce for MongoDB.

This module is an extension for [aggregate-reduce](https://github.com/tounano/aggregate-reduce)

It will help you to perform aggregate-reduce operations incrementally.

## Usage:

### var aggregateReduce = require('incremental-ar')(?baseAR);

Decorate [aggregate-reduce](https://github.com/tounano/aggregate-reduce).

If `baseAR` is absent, it'll use the default, which is [aggregate-reduce](https://github.com/tounano/aggregate-reduce).

### aggregateReduce(col, arr, map, reduce, opts, cb)

Perform A/R as with [aggregate-reduce](https://github.com/tounano/aggregate-reduce). Everything stays the same, except
of that some options were added.

#### options

*  Everything that work with [aggregate-reduce](https://github.com/tounano/aggregate-reduce).
*  `timestampPath` - (optional|default='timestamp'). path to the key that indicates the timestamp of the source collection.
*  `lastTimestampPath` - (optional|default='timestamp'). path to timestamp of the reducedCollection. You don't need to prefix
 it with `value`. Don't do `value.timestamp`. `value` would be prefixed by the module.
*  `defaultTimestamp` - (optional|default=0). In case you never ran this A/R job, which timestamp to start from the first time.
 You can mark it as `null` if you want to do the first A/R manually.
*  `cutoff` - (optional|default=0 seconds). In case you don't want the A/R to be in realtime, you can specify a `cutoff` in
 seconds. It will A/R only the objects that were added before the `cutoff`.

#### keep in mind

You **MUST** have a `timestamp` value both in your aggregation pipeline and in the reduce function.

####Example

The following example has a `cutoff` of 20 seconds. Which means that the first time you run it, nothing would happen.

After you waited 20 seconds, it'll insert more RAW data to `test` collection and reduce the first batch to `tstReduce`.

```js
var MongoClient = require('mongodb').MongoClient;
var aggregateReduce = require('incremental-ar')();

MongoClient.connect('YOUR MONGO URI',{}, function (err, db) {
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
```

## install

With [npm](https://npmjs.org) do:

```
npm install incremental-ar
```

## license

MIT