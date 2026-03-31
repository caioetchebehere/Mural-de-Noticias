(function () {
  "use strict";

  var M = window.MuralNoticias;
  var ALLOWED_EXT = [".pdf", ".xls", ".xlsx", ".png"];

  var form = document.getElementById("news-form");
  var authorInput = document.getElementById("news-author");
  var titleInput = document.getElementById("news-title");
  var contentInput = document.getElementById("news-content");
  var filesInput = document.getElementById("news-files");
  var formError = document.getElementById("form-error");
  var newsList = document.getElementById("news-list");
  var feedEmpty = document.getElementById("feed-empty");
  var shareUrlInput = document.getElementById("share-url");
  var copyShareBtn = document.getElementById("copy-share-url");
  var submitBtn = document.getElementById("submit-news");
  var cancelEditBtn = document.getElementById("cancel-edit");
  var editBanner = document.getElementById("edit-banner");

  var editingId = null;
  var editingAttachments = null;

  function getExtension(name) {
    var i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i).toLowerCase();
  }

  function isAllowedFile(file) {
    return ALLOWED_EXT.indexOf(getExtension(file.name)) !== -1;
  }

  function showError(message) {
    formError.textContent = message;
    formError.hidden = !message;
  }

  function cancelEdit() {
    editingId = null;
    editingAttachments = null;
    form.reset();
    if (filesInput) filesInput.value = "";
    if (cancelEditBtn) cancelEditBtn.hidden = true;
    if (editBanner) {
      editBanner.hidden = true;
      editBanner.textContent = "";
    }
    if (submitBtn) submitBtn.textContent = "Publicar notícia";
    showError("");
  }

  function refreshList() {
    var items = M.loadNews();
    var highlightId = M.getLatestTodayId(items);
    M.renderNewsList(newsList, feedEmpty, items, highlightId, {
      onEdit: startEdit,
      onDelete: deleteNews,
    });
  }

  function findItemById(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function startEdit(id) {
    var items = M.loadNews();
    var item = findItemById(items, id);
    if (!item) return;

    editingId = id;
    editingAttachments = (item.attachments || []).map(function (a) {
      return {
        name: a.name,
        mimeType: a.mimeType,
        dataBase64: a.dataBase64,
      };
    });

    authorInput.value = item.author || "";
    titleInput.value = item.title;
    contentInput.value = item.content;
    if (filesInput) filesInput.value = "";
    if (cancelEditBtn) cancelEditBtn.hidden = false;
    if (editBanner) {
      editBanner.hidden = false;
      editBanner.textContent =
        "Você está editando uma publicação existente. A data original de publicação é mantida. Novos anexos são adicionados aos atuais.";
    }
    if (submitBtn) submitBtn.textContent = "Salvar alterações";
    showError("");
    titleInput.focus();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function deleteNews(id) {
    if (!window.confirm("Excluir esta publicação? Esta ação não pode ser desfeita.")) {
      return;
    }
    var wasEditing = editingId === id;
    var items = M.loadNews().filter(function (it) {
      return it.id !== id;
    });
    try {
      M.saveNews(items);
    } catch (err) {
      if (
        err &&
        (err.name === "QuotaExceededError" || err.code === 22 || err.code === 1014)
      ) {
        showError("Não foi possível salvar após excluir. Tente novamente.");
      } else {
        showError(err.message || "Erro ao excluir.");
      }
      return;
    }
    if (wasEditing) cancelEdit();
    refreshList();
  }

  function setShareUrl() {
    if (!shareUrlInput) return;
    try {
      shareUrlInput.value = new URL("leitura.html", window.location.href).href;
    } catch (e) {
      shareUrlInput.value =
        window.location.origin +
        window.location.pathname.replace(/[^/]+$/, "leitura.html");
    }
  }

  if (copyShareBtn && shareUrlInput) {
    copyShareBtn.addEventListener("click", function () {
      shareUrlInput.select();
      shareUrlInput.setSelectionRange(0, 99999);
      var url = shareUrlInput.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () {
            copyShareBtn.textContent = "Copiado!";
            setTimeout(function () {
              copyShareBtn.textContent = "Copiar link";
            }, 2000);
          },
          function () {
            try {
              document.execCommand("copy");
              copyShareBtn.textContent = "Copiado!";
              setTimeout(function () {
                copyShareBtn.textContent = "Copiar link";
              }, 2000);
            } catch (err) {
              copyShareBtn.textContent = "Selecione e copie (Ctrl+C)";
            }
          }
        );
      } else {
        try {
          document.execCommand("copy");
          copyShareBtn.textContent = "Copiado!";
          setTimeout(function () {
            copyShareBtn.textContent = "Copiar link";
          }, 2000);
        } catch (err2) {
          copyShareBtn.textContent = "Selecione e copie (Ctrl+C)";
        }
      }
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", function () {
      cancelEdit();
      refreshList();
    });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");

    var author = authorInput.value.trim();
    var title = titleInput.value.trim();
    var content = contentInput.value.trim();
    var files = filesInput.files
      ? Array.prototype.slice.call(filesInput.files)
      : [];

    if (!author) {
      showError("Informe o nome do responsável pela publicação.");
      authorInput.focus();
      return;
    }
    if (!title) {
      showError("Informe o título da notícia.");
      titleInput.focus();
      return;
    }
    if (!content) {
      showError("Informe o conteúdo da notícia.");
      contentInput.focus();
      return;
    }

    var invalid = files.filter(function (f) {
      return !isAllowedFile(f);
    });
    if (invalid.length > 0) {
      showError(
        "Arquivo não permitido: " +
          invalid[0].name +
          ". Use apenas PDF, Excel ou PNG (.pdf, .xls, .xlsx, .png)."
      );
      return;
    }

    var btn = submitBtn || form.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = editingId != null ? "Salvando…" : "Publicando…";
    }

    var promises = files.map(function (file) {
      return M.readFileAsDataURL(file).then(function (dataUrl) {
        return M.dataUrlToAttachment(dataUrl, file.name);
      });
    });

    Promise.all(promises)
      .then(function (newAttachments) {
        var items = M.loadNews();

        if (editingId != null) {
          var idx = -1;
          for (var i = 0; i < items.length; i++) {
            if (items[i].id === editingId) {
              idx = i;
              break;
            }
          }
          if (idx === -1) {
            throw new Error("Notícia não encontrada. Atualize a página.");
          }
          var base = editingAttachments ? editingAttachments.slice() : [];
          var merged = base.concat(newAttachments);
          items[idx] = {
            id: items[idx].id,
            author: author,
            title: title,
            content: content,
            publishedAt: items[idx].publishedAt,
            attachments: merged,
          };
        } else {
          var item = {
            id: M.nextId(items),
            author: author,
            title: title,
            content: content,
            publishedAt: new Date().toISOString(),
            attachments: newAttachments,
          };
          items = [item].concat(items);
        }

        try {
          M.saveNews(items);
        } catch (err) {
          if (
            err &&
            (err.name === "QuotaExceededError" ||
              err.code === 22 ||
              err.code === 1014)
          ) {
            throw new Error(
              "Armazenamento cheio. Reduza o tamanho dos anexos ou aguarde notícias antigas saírem (7 dias)."
            );
          }
          throw err;
        }

        refreshList();
        cancelEdit();
        showError("");
      })
      .catch(function (err) {
        showError(err.message || "Não foi possível salvar. Tente novamente.");
      })
      .finally(function () {
        if (btn) {
          btn.disabled = false;
          btn.textContent =
            editingId != null ? "Salvar alterações" : "Publicar notícia";
        }
      });
  });

  setShareUrl();
  refreshList();
})();
