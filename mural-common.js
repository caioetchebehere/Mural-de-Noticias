(function (global) {
  "use strict";

  var STORAGE_KEY = "painelNoticiasSuporteLojas_v1";
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  function parseItems(raw) {
    try {
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function withinWeek(publishedAt) {
    var t = new Date(publishedAt).getTime();
    if (isNaN(t)) return false;
    return Date.now() - t <= WEEK_MS;
  }

  function sortDesc(a, b) {
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  }

  function loadNews() {
    var items = parseItems(localStorage.getItem(STORAGE_KEY) || "[]");
    var kept = items.filter(function (it) {
      return withinWeek(it.publishedAt);
    });
    if (kept.length !== items.length) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
      } catch (e) {
        /* ignore */
      }
    }
    kept.sort(sortDesc);
    return kept;
  }

  function saveNews(items) {
    var kept = items.filter(function (it) {
      return withinWeek(it.publishedAt);
    });
    kept.sort(sortDesc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
    return kept;
  }

  function nextId(items) {
    return items.reduce(function (m, it) {
      var id = typeof it.id === "number" ? it.id : 0;
      return id > m ? id : m;
    }, 0) + 1;
  }

  function dataUrlToAttachment(dataUrl, name) {
    var comma = dataUrl.indexOf(",");
    var header = dataUrl.slice(0, comma);
    var mime = "application/octet-stream";
    var m = header.match(/data:([^;]+)/);
    if (m) mime = m[1];
    return {
      name: name,
      mimeType: mime,
      dataBase64: dataUrl.slice(comma + 1),
    };
  }

  function attachmentHref(att) {
    if (att.url) return att.url;
    if (att.dataBase64 && att.mimeType) {
      return "data:" + att.mimeType + ";base64," + att.dataBase64;
    }
    return "";
  }

  function isPngAttachment(att) {
    if (att.mimeType === "image/png") return true;
    var n = (att.name || "").toLowerCase();
    var i = n.lastIndexOf(".");
    return i !== -1 && n.slice(i) === ".png";
  }

  function getLatestTodayId(items) {
    var now = new Date();
    var y = now.getFullYear();
    var mo = now.getMonth();
    var d = now.getDate();
    var sameDay = items.filter(function (it) {
      var dt = new Date(it.publishedAt);
      return (
        dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d
      );
    });
    if (sameDay.length === 0) return null;
    sameDay.sort(sortDesc);
    return sameDay[0].id;
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () {
        resolve(r.result);
      };
      r.onerror = function () {
        reject(r.error);
      };
      r.readAsDataURL(file);
    });
  }

  function formatDateTime(date) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
    } catch (e) {
      return date.toLocaleString("pt-BR");
    }
  }

  function renderNewsList(ul, feedEmpty, items, highlightId, adminOpts) {
    ul.innerHTML = "";

    if (!items || items.length === 0) {
      if (feedEmpty) feedEmpty.hidden = false;
      ul.hidden = true;
      return;
    }

    if (feedEmpty) feedEmpty.hidden = true;
    ul.hidden = false;

    var hasEdit =
      adminOpts &&
      typeof adminOpts.onEdit === "function";
    var hasDelete =
      adminOpts &&
      typeof adminOpts.onDelete === "function";
    var hasActions = hasEdit || hasDelete;

    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "news-card";
      li.setAttribute("data-news-id", String(item.id));
      if (highlightId != null && item.id === highlightId) {
        li.classList.add("news-card--hoje");
      }

      if (hasActions) {
        var toolbar = document.createElement("div");
        toolbar.className = "news-card__actions";

        if (hasEdit) {
          var btnEdit = document.createElement("button");
          btnEdit.type = "button";
          btnEdit.className = "btn-card btn-card--edit";
          btnEdit.textContent = "Editar";
          btnEdit.setAttribute("aria-label", "Editar: " + item.title);
          (function (newsId) {
            btnEdit.addEventListener("click", function () {
              adminOpts.onEdit(newsId);
            });
          })(item.id);
          toolbar.appendChild(btnEdit);
        }

        if (hasDelete) {
          var btnDel = document.createElement("button");
          btnDel.type = "button";
          btnDel.className = "btn-card btn-card--delete";
          btnDel.textContent = "Excluir";
          btnDel.setAttribute("aria-label", "Excluir: " + item.title);
          (function (newsId) {
            btnDel.addEventListener("click", function () {
              adminOpts.onDelete(newsId);
            });
          })(item.id);
          toolbar.appendChild(btnDel);
        }

        li.appendChild(toolbar);
      }

      var h3 = document.createElement("h3");
      h3.textContent = item.title;

      var meta = document.createElement("p");
      meta.className = "news-meta";
      var author = (item.author || "").trim();
      meta.textContent =
        (author ? "Publicado por " + author + " em " : "Publicado em ") +
        formatDateTime(new Date(item.publishedAt));

      var body = document.createElement("p");
      body.className = "news-body";
      body.textContent = item.content;

      li.appendChild(h3);
      li.appendChild(meta);
      li.appendChild(body);

      if (item.attachments && item.attachments.length > 0) {
        var wrap = document.createElement("div");
        wrap.className = "attachments";
        var attTitle = document.createElement("p");
        attTitle.className = "attachments-title";
        attTitle.textContent = "Anexos";
        var attUl = document.createElement("ul");
        item.attachments.forEach(function (att) {
          var fileLi = document.createElement("li");
          var href = attachmentHref(att);
          if (href && isPngAttachment(att)) {
            fileLi.className = "attachment-item attachment-item--png";
            var img = document.createElement("img");
            img.src = href;
            img.alt = att.name
              ? "Imagem anexada: " + att.name
              : "Imagem PNG anexada";
            img.className = "attachment-preview-img";
            img.loading = "lazy";
            fileLi.appendChild(img);
            var linkRow = document.createElement("div");
            linkRow.className = "attachment-download-row";
            var a = document.createElement("a");
            a.href = href;
            a.download = att.name;
            a.textContent = att.name;
            linkRow.appendChild(a);
            fileLi.appendChild(linkRow);
          } else if (href) {
            var a2 = document.createElement("a");
            a2.href = href;
            if (att.mimeType === "text/uri-list") {
              a2.target = "_blank";
              a2.rel = "noopener noreferrer";
              a2.textContent = (att.name || href);
            } else {
              a2.download = att.name;
              a2.textContent = att.name;
            }
            fileLi.appendChild(a2);
          } else {
            fileLi.textContent = att.name;
          }
          attUl.appendChild(fileLi);
        });
        wrap.appendChild(attTitle);
        wrap.appendChild(attUl);
        li.appendChild(wrap);
      }

      ul.appendChild(li);
    });
  }

  global.MuralNoticias = {
    STORAGE_KEY: STORAGE_KEY,
    WEEK_MS: WEEK_MS,
    loadNews: loadNews,
    saveNews: saveNews,
    nextId: nextId,
    dataUrlToAttachment: dataUrlToAttachment,
    attachmentHref: attachmentHref,
    getLatestTodayId: getLatestTodayId,
    readFileAsDataURL: readFileAsDataURL,
    formatDateTime: formatDateTime,
    renderNewsList: renderNewsList,
  };
})(window);
