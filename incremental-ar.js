module.exports = function (aggregateReduce) {
  aggregateReduce = aggregateReduce || require('aggregate-reduce');
  return function (col, arr, map, reduce, opts, cb) {
    var reducedCollection = opts && opts.out && opts.out.reduce;
    if (!reducedCollection) return aggregateReduce(col, arr, map, reduce, opts, cb);

    var timestampPath = opts.timestampPath || "timestamp";
    var lastTimestampPath = opts.lastTimestampPath || "timestamp";
    var defaultTimestamp = opts.defaultTimestamp || 0;

    var cutoff = opts.cutoff || 0; delete opts.cutoff;

    col.db.collection(reducedCollection, function (err, reducedCollection) {
      if (err) return cb(err);

      reducedCollection.findOne({}, {
        sort: [["value." + lastTimestampPath, -1]],
        batchSize: 10
      }, function (err, lastValue) {
        if (err) return cb(err);

        var lastTimestamp = lastValue && lastValue.value &&
          lastValue.value[lastTimestampPath] || defaultTimestamp;

        if (lastTimestamp || lastTimestamp === 0) {
          cutoff = new Date().getTime() - (cutoff * 1000);
          var matcher = {};
          matcher[timestampPath] = {$gt: lastTimestamp, $lt: cutoff};
          arr.unshift({$match:matcher});

          aggregateReduce(col, arr, map, reduce, opts, cb);
        }
      })
    })
  }
}