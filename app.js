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
  var submitBtn = document.getElementById("submit-news");
  var cancelEditBtn = document.getElementById("cancel-edit");
  var editBanner = document.getElementById("edit-banner");
  var dialog = document.getElementById("upload-dialog");
  var openUploadBtn = document.getElementById("open-upload-btn");
  var closeDialogBtn = document.getElementById("close-dialog-btn");
  var fileNamesEl = document.getElementById("file-names");

  var editingId = null;
  var editingAttachments = null;
  var currentItems = [];

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

  function openDialog() {
    if (dialog.showModal) dialog.showModal();
  }

  function closeDialog() {
    if (dialog.close) dialog.close();
    cancelEdit();
  }

  function requestJson(url, options) {
    return fetch(url, options).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          throw new Error(data.error || "Falha na comunicação com o servidor.");
        });
      }
      return res.json();
    });
  }

  function cancelEdit() {
    editingId = null;
    editingAttachments = null;
    form.reset();
    if (filesInput) filesInput.value = "";
    if (fileNamesEl) fileNamesEl.textContent = "";
    if (cancelEditBtn) cancelEditBtn.hidden = true;
    if (editBanner) {
      editBanner.hidden = true;
      editBanner.textContent = "";
    }
    if (submitBtn) submitBtn.textContent = "Publicar notícia";
    showError("");
  }

  function renderFromState() {
    var highlightId = M.getLatestTodayId(currentItems);
    M.renderNewsList(newsList, feedEmpty, currentItems, highlightId, {
      onEdit: startEdit,
      onDelete: deleteNews,
    });
  }

  function refreshList() {
    return requestJson("/api/news")
      .then(function (data) {
        currentItems = Array.isArray(data.items) ? data.items : [];
        renderFromState();
      })
      .catch(function (err) {
        showError(err.message || "Não foi possível carregar as notícias.");
      });
  }

  function findItemById(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function startEdit(id) {
    var item = findItemById(currentItems, id);
    if (!item) return;

    editingId = id;
    editingAttachments = (item.attachments || []).map(function (a) {
      return {
        name: a.name,
        mimeType: a.mimeType,
        url: a.url,
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
    openDialog();
    titleInput.focus();
  }

  function deleteNews(id) {
    if (!window.confirm("Excluir esta publicação? Esta ação não pode ser desfeita.")) {
      return;
    }

    requestJson("/api/news?id=" + encodeURIComponent(String(id)), {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    })
      .then(function (data) {
        currentItems = Array.isArray(data.items) ? data.items : [];
        if (editingId === id) cancelEdit();
        renderFromState();
      })
      .catch(function (err) {
        showError(err.message || "Erro ao excluir.");
      });
  }

  if (filesInput && fileNamesEl) {
    filesInput.addEventListener("change", function () {
      var files = Array.prototype.slice.call(filesInput.files || []);
      if (files.length === 0) {
        fileNamesEl.textContent = "";
      } else {
        fileNamesEl.textContent = files.map(function (f) { return f.name; }).join(", ");
      }
    });
  }

  if (openUploadBtn) {
    openUploadBtn.addEventListener("click", function () {
      cancelEdit();
      openDialog();
      authorInput.focus();
    });
  }

  if (closeDialogBtn) {
    closeDialogBtn.addEventListener("click", closeDialog);
  }

  // Close on backdrop click
  if (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", function () {
      closeDialog();
      renderFromState();
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
      btn.textContent = editingId != null ? "Salvando..." : "Publicando...";
    }

    var promises = files.map(function (file) {
      return M.readFileAsDataURL(file).then(function (dataUrl) {
        return M.dataUrlToAttachment(dataUrl, file.name);
      });
    });

    Promise.all(promises)
      .then(function (newAttachments) {
        if (editingId != null) {
          var base = editingAttachments ? editingAttachments.slice() : [];
          return requestJson("/api/news", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: editingId,
              author: author,
              title: title,
              content: content,
              attachments: base.concat(newAttachments),
            }),
          });
        }
        return requestJson("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            author: author,
            title: title,
            content: content,
            attachments: newAttachments,
          }),
        });
      })
      .then(function (data) {
        currentItems = Array.isArray(data.items) ? data.items : [];
        renderFromState();
        closeDialog();
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

  refreshList();
})();
