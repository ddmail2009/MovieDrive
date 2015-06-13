var fs = require("fs");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var request = require("request").defaults({encoding: null});

app.use(express.static(__dirname + "/public"));
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

// resources preloading
var movies;
fs.readFile("movieList.txt", function(err, data){
  if(err) throw err;
  movies = JSON.parse(data);
});


// application url setting
app.get("/", function(req, res){
  res.render("index.html", {"movies": movies})
});

app.get("/poster/:posterURL", function(req, res){
  var posterURL = req.params.posterURL;
  try{

    // check if the file exist
    fs.lstatSync("public/poster/" + posterURL);
    console.log("file [" + posterURL + "] exist");
    // read and response
    fs.readFile("public/poster/" + posterURL, function(err, body){
      if(err) throw err;
      res.end(body, "binary");
    });
  } catch(e){
    // fetching the image
    request.get("https://image.tmdb.org/t/p/w300/" + posterURL, function(err, res2, body){
      if(err) throw err;
      console.log('content-type: ', res2.headers['content-type']);
      console.log(res2.body);

      res.writeHead(200, {"Content-Type": res2.headers['content-type']});
      res.end(res2.body, "binary");

      if(res2.headers['content-type'].indexOf("text") < 0){
        fs.writeFile("public/poster/" + posterURL, res2.body, 'binary', function(err){
          if(err) throw err;
          console.log("file [" + posterURL + "] saved.");
        })
      } else console.log("remote url result is not image");

    });
  }

  // send back the content
});

app.post("/updateMovieList", function(req, res){
  console.log(req.body);
  var movies = req.body.movie;
  movies = JSON.parse(movies);

  console.log(movies);
  fs.writeFile("movieList.txt", JSON.stringify(movies, null, "\t"), function(err, data){
    if(err) throw err;
    else {
      console.log(data);
      res.end(JSON.stringify({"status": "success"}));
    }
  })
});