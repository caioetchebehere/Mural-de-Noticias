(function () {
  "use strict";

  var M = window.MuralNoticias;
  var newsList = document.getElementById("news-list");
  var feedEmpty = document.getElementById("feed-empty");

  function loadSharedNews() {
    return fetch("/api/news")
      .then(function (res) {
        if (!res.ok) throw new Error("Não foi possível carregar as notícias.");
        return res.json();
      })
      .then(function (data) {
        var items = Array.isArray(data.items) ? data.items : [];
        var highlightId = M.getLatestTodayId(items);
        M.renderNewsList(newsList, feedEmpty, items, highlightId);
      })
      .catch(function () {
        M.renderNewsList(newsList, feedEmpty, [], null);
      });
  }

  loadSharedNews();
})();
