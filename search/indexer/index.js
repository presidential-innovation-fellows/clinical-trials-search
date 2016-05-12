const Indexer = require("./indexer"),
      Logger = require("./logger");

let indexer = new Indexer();
let logger = new Logger();

indexer.deleteIndex()
.then(indexer.initIndex())
.then(indexer.initMapping());
