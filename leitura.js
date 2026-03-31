(function () {
  "use strict";

  var M = window.MuralNoticias;
  var newsList = document.getElementById("news-list");
  var feedEmpty = document.getElementById("feed-empty");

  var items = M.loadNews();
  var highlightId = M.getLatestTodayId(items);
  M.renderNewsList(newsList, feedEmpty, items, highlightId);
})();
