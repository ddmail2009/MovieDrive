var defered = [];

function splitFolderName(name){
  var m, title=name, year;
  if((m = /(?!\()[0-9]{4}(?=\))/.exec(name)) != null){
    title = name.slice(0, m.index-2);
    year = m[0];
  }
  return {"title": title, "year": year};
}
function addMovieItems(movies, sortField, reverse){
  sortField = sortField || "title";
  reverse = reverse || false;
  console.log("sort Field: " + sortField);
  console.log("reverse: " + reverse);
  movies.sort(function(a, b){
    if(a[sortField] > b[sortField]) return 1;
    else if(a[sortField] < b[sortField]) return -1;
    else return 0;
  });
  if(reverse) movies.reverse();
  for(i in movies){
    template = "<movie-card></movie-card>";
    template = $(template).attr("link", movies[i].alternateLink);
    template = $(template).attr("title", movies[i].title);
    template = $(template).attr("poster", movies[i].img);
    template = $(template).attr("score", movies[i].vote_average);
    template = $(template).attr("meta", movies[i].release_date);

    $("#movie-list").append(template);
  }
  $(".movie-item").hover(function(){
    $(this).find(".movie-poster").addClass("poster-hovered");
  }, function(){
    $(this).find(".movie-poster").removeClass("poster-hovered");
  });
}
// retrieve all folder information then callback with list
function retrieveAllFiles(callback) {
  var retrievePageOfFiles = function(request, result) {
    console.log("retrieve Movie Drive List");
    request.execute(function(resp) {
      result = result.concat(resp.items);
      var nextPageToken = resp.nextPageToken;
      if (nextPageToken) {
        request = gapi.client.drive.files.list({
          'pageToken': nextPageToken,
          'maxResults': 1000,
          'fields': 'items(lastModifyingUser,alternateLink,indexableText,id,description,downloadUrl,originalFilename,exportLinks,mimeType,createdDate,modifiedDate,fileExtension,fileSize,quotaBytesUsed,defaultOpenWithLink,videoMediaMetadata,kind,ownerNames,parents,title,properties,selfLink,lastModifyingUserName,openWithLinks),kind'
        });
        retrievePageOfFiles(request, result);
      } else {
        callback(result);
      }
    });
  }
  var initialRequest = gapi.client.drive.files.list({
    'q': "'0B50CePww-EvZflNDMGJIaU1lZ3ZIM2ZHREJQMEhrYk1fZmtENDhtc25nSFFFSE5XNndpXzg' in parents",
    'maxResults': 1000,
    'fields': 'items(lastModifyingUser,alternateLink,indexableText,id,description,downloadUrl,originalFilename,exportLinks,mimeType,createdDate,modifiedDate,fileExtension,fileSize,quotaBytesUsed,defaultOpenWithLink,videoMediaMetadata,kind,ownerNames,parents,title,properties,selfLink,lastModifyingUserName,openWithLinks),kind'
  });
  retrievePageOfFiles(initialRequest, []);
}
function fetchAJAXCall(list, i){
  var meta = splitFolderName(list[i]["title"]);
  meta['link'] = list[i].alternateLink;
  defered.push($.ajax({
    method: "GET", 
    url: "http://api.themoviedb.org/3/search/movie",
    data: {
      api_key: "304f4c3ad090ac7a11e707e9cf034ddf", 
      query: meta["title"],
      year: meta['year']
    },
    indexValue: i,
    strip_title: meta['title'],
    success: function(data){
      bestFit = {"title": "no match", "img": "poster.jpg", "alternateLink": "#", "votes": -1};
      for(j in data.results){
        if(data.results[j].vote_average*data.results[j].vote_count > bestFit.votes) 
          bestFit = data.results[j];
      }
      list[this.indexValue].folder_title = list[this.indexValue].title;
      list[this.indexValue].folder_strip_title = this.strip_title;
      list[this.indexValue].title = bestFit.title || bestFit.original_name;
      list[this.indexValue].vote_average = bestFit.vote_average;
      list[this.indexValue].img = "/poster" + bestFit.poster_path;
      list[this.indexValue].release_date = bestFit.release_date;
    }
  }));
}
function fetchMovieMeta(list, callback, start){
  defered = [];
  start = start | 0;
  console.log("start: " + start);
  $.each(list.slice(start, start+40), function(i){
    fetchAJAXCall(list, i+start, 0);
  });
  if(start + 40 >= list.length && callback){
    $.when.apply(null, defered).then(callback);
  } else {
    setTimeout(function(){
      fetchMovieMeta(list, callback, start+40);
    }, 11000);
  }
}
function refineList(list){
  var n_list = [];
  var n_movies = [];

  for(i in movies)
    movies[i].flag = false;
  for(i in list)
    list[i].flag = false;

  // remove deleted items from movie variable
  for(i in movies){
    for(j in list){
      if(movies[i].id == list[j].id && movies[i].lastModifiedDate == list[j].lastModifiedDate){
        movies[i].flag = true;
        list[j].flag = true
        // console.log(movies[i].title + "===================" + list[j].title);
        break;
      }
    }

    if(movies[i].flag == true){
      n_movies.push(movies[i]);
    }
  }

  for(i in list){
    if(list[i].flag == false)
      n_list.push(list[i]);
  }
  movies = n_movies;
  return n_list;
}
function getSubMovies(m, text){
  var result = [];
  text = text.toLowerCase();
  for(i in m){
    if(m[i].folder_strip_title.toLowerCase().indexOf(text) >= 0 || 
      m[i].folder_title.toLowerCase().indexOf(text) >= 0 ||
      m[i].title.toLowerCase().indexOf(text) >= 0 ||
      m[i].release_date.toLowerCase().indexOf(text) >= 0) 
      result.push(m[i]);
  }
  return result;
}
function updateMovieList(all){
  all = all | false;

  $("#refreshAll").hide();
  $("#refresh").hide();
  $("#movie-list").html("<paper-progress id='progress' value=\"0\"></paper-progress>");

  if(all == true) movies = [];
  retrieveAllFiles(function(list){
    list = refineList(list);
    console.log(list);

    fetchMovieMeta(list, function(startIndex){
      console.log("fetch complete");
      for(i in list){
        movies.push(list[i]);
      }
      $.post("/updateMovieList", {"movie": JSON.stringify(movies)}, function(data){
        console.log("post return data: " + data);
      });
      $("#movie-list").html("");
      addMovieItems(movies, "modifiedDate");

      $("#refreshAll").show();
      $("#refresh").show();
    });
  });
}

$(document).ready(function(){
  if(movies.length) addMovieItems(movies, "modifiedDate");
  $("#refresh").click(function(){
    updateMovieList(false);
  });
  $("#refreshAll").click(function(){
    updateMovieList(true);
  });
  $("#sortTitle").click(function(){
    $("#movie-list").html("");
    addMovieItems(movies, "title");
  });
  $("#sortDate").click(function(){
    $("#movie-list").html("");
    addMovieItems(movies, "release_date", true);
  });
  $("#sortRate").click(function(){
    $("#movie-list").html("");
    addMovieItems(movies, "vote_average", true);
  });
  $("#sortMDate").click(function(){
    $("#movie-list").html("");
    addMovieItems(movies, "modifiedDate");
  })

  $("#search").on('input', function(){
    var S = $(this).val();
    console.log(S);
    currentMovies = getSubMovies(movies, S);
    console.log(currentMovies);
    $("#movie-list").html("");
    addMovieItems(currentMovies, "modifiedDate");
  });

  $(document).scroll(function(){
    if(document.body.scrollTop > 64)
      $(".navbar").addClass("navbar-fixed-top");
    else
      $(".navbar").removeClass("navbar-fixed-top");
  });
});