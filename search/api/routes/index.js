var express = require('express');
var elastic = require('elasticsearch');
var router = express.Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Express' });
});

router.get('/search', (req, res, next) => {

});

module.exports = router;
