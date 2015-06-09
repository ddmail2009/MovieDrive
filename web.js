var fs = require("fs");
var express = require("express");
var app = express();
var bodyParser = require("body-parser");

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
})

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
})
