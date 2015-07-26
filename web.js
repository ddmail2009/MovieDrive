var fs = require("fs");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var request = require("request").defaults({encoding: null});

var cacheTime = 86400000*7*1000; // 7days
app.use(express.static(__dirname + "/public", {maxAge: cacheTime}));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({
  extended: true,
  limit: '5mb'
}));
app.set('views',__dirname + '/views');
app.set('port', (process.env.PORT || 3000))

app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

var server = app.listen(app.get('port'), function(){
  var host = server.address().address;
  var port = server.address().port;
  console.log("movie theater is listening at http://%s:%s", host, port);
});

var Log = function(data){
  console.log("====" + new Date() + "====: " + data);
}

// resources preloading
var movies = [];

// application url setting
app.get("/", function(req, res){
  fs.readFile("movieList.txt", function(err, data){
    if(err) return;
    movies = JSON.parse(data);
    Log("index page, sending up-to-date movie list");
    res.render("index.html", {"movies": movies})
  });
});

app.get("/poster/:posterURL", function(req, res){
  var posterURL = req.params.posterURL;
  try{
    // check if the file exist
    fs.lstatSync("public/poster/" + posterURL);
    Log("file [" + posterURL + "] exist");
    // read and response
    fs.readFile("public/poster/" + posterURL, function(err, body){
      if(err) throw err;
      res.end(body, "binary");
    });
  } catch(e){
    // fetching the image
    request.get("https://image.tmdb.org/t/p/w300/" + posterURL, function(err, res2, body){
      if(err) throw err;
      Log('content-type: ', res2.headers['content-type']);
      Log(res2.body + " -> poster/" + posterURL);

      res.writeHead(200, {"Content-Type": res2.headers['content-type']});
      res.end(res2.body, "binary");

      if(res2.headers['content-type'].indexOf("text") < 0){
        fs.writeFile("public/poster/" + posterURL, res2.body, 'binary', function(err){
          if(err) throw err;
        })
      } else Log("remote url result is not image");
    });
  }
  // send back the content
});

app.post("/updateMovieList", function(req, res){
  movies = JSON.parse(req.body.movie);

  Log("update Movie List");
  fs.writeFile("movieList.txt", JSON.stringify(movies, null, "\t"), function(err, data){
    if(err) throw err;
    else {
      Log("update Movie List, Success");
      res.end(JSON.stringify({"status": "success"}));
    }
  })
});