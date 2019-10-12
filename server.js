const MONGO_URI = 'mongodb://urlshortener:urlshortener@server.andreibuntsev.com:27017/urlshortener';
const MongoClient = require('mongodb').MongoClient;
const express = require('express')
const app = express()
const urlExists = require('url-exists');
const bodyParser = require('body-parser')
const cors = require('cors')
const MONGO_CLIENT_OPTIONS = { useUnifiedTopology: true, useNewUrlParser: true };
const MONGO_DB_NAME = 'urlshortener';


app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use('/public', express.static(process.cwd() + '/public'));


app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({ greeting: 'hello API' });
});


app.post('/api/shorturl/new', (req, res) => {
  const url = req.body.url;
  urlExists(url, function (err, exists) {
    if (err) {
      res.json({ err: err });
      return;
    }

    if (!exists) {
      res.json({ "error": "invalid Hostname" });
      return;
    }

    MongoClient.connect(MONGO_URI, MONGO_CLIENT_OPTIONS, async function (err, client) {
      if (err) {
        res.json({ err: err });
        return;
      } else {
        try {
          const db = client.db(MONGO_DB_NAME);
          let urlEntry = await db.collection('urls').find({ url: url }).next();
          if (urlEntry) {
            //URL already exists
            res.json({ original_url: urlEntry.url, short_url: urlEntry.code });
          } else {
            //Count total entry count
            let count = await db.collection('urls').find().count();
            //Insert URL
            await db.collection('urls').insertOne({ url: url, code: count + 1 });
            res.json({ original_url: url, short_url: count + 1 });
          }
        }
        catch (e) {
          res.json({ err: e });
        }

        client.close();
      }
    });
  });
});


app.get('/api/shorturl/:code', (req, res) => {
  let code = parseInt(req.params.code);
  if (Number.isNaN(code)) {
    res.json({ "error": "Wrong Format" });
    return;
  }

  MongoClient.connect(MONGO_URI, MONGO_CLIENT_OPTIONS, async function (err, client) {
    if (err) {
      res.json({ err: err });
    } else {
      try {
        const db = client.db(MONGO_DB_NAME);
        let urlEntry = await db.collection('urls').find({ code: code }).next();
        if (!urlEntry) {
          res.json({ "error": "No short url found for given input" });
          return;
        }

        res.redirect(urlEntry.url);
      }
      catch (e) {
        console.error(e);
      }

      client.close();
    }
  });
})


app.listen(3050, function () {
  console.log('Node.js listening on 3050 port...');
});