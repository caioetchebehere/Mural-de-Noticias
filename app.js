(function () {
  "use strict";

  var M = window.MuralNoticias;
  var ALLOWED_EXT = [".pdf", ".xls", ".xlsx", ".png"];

  var form = document.getElementById("news-form");
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
  var loginForm = document.getElementById("login-form");
  var authUserInput = document.getElementById("auth-user");
  var authPassInput = document.getElementById("auth-pass");
  var authError = document.getElementById("auth-error");
  var authStatus = document.getElementById("auth-status");
  var loginBtn = document.getElementById("login-btn");
  var logoutBtn = document.getElementById("logout-btn");

  var editingId = null;
  var editingAttachments = null;
  var isAuthenticated = false;
  var currentUser = "";
  var isAdmin = false;

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

  function showAuthError(message) {
    if (!authError) return;
    authError.textContent = message;
    authError.hidden = !message;
  }

  function setAuthStatus(text, kind) {
    if (!authStatus) return;
    authStatus.textContent = text;
    authStatus.classList.remove("auth-status--ok", "auth-status--warn");
    if (kind === "ok") authStatus.classList.add("auth-status--ok");
    if (kind === "warn") authStatus.classList.add("auth-status--warn");
  }

  function setPublishingEnabled(enabled) {
    var fields = form.querySelectorAll("input, textarea, button");
    for (var i = 0; i < fields.length; i++) {
      fields[i].disabled = !enabled;
    }
    if (!enabled) {
      cancelEdit();
    }
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
    var opts = null;
    if (isAuthenticated) {
      opts = {
        onEdit: startEdit,
      };
      if (isAdmin) {
        opts.onDelete = deleteNews;
      }
    }
    M.renderNewsList(newsList, feedEmpty, items, highlightId, opts);
  }

  function findItemById(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  function startEdit(id) {
    if (!isAuthenticated) return;
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
    if (!isAuthenticated || !isAdmin) return;
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
    if (!isAuthenticated) {
      showError("Faça login para publicar notícias.");
      return;
    }
    showError("");

    var title = titleInput.value.trim();
    var content = contentInput.value.trim();
    var files = filesInput.files
      ? Array.prototype.slice.call(filesInput.files)
      : [];

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
            title: title,
            content: content,
            publishedAt: items[idx].publishedAt,
            attachments: merged,
          };
        } else {
          var item = {
            id: M.nextId(items),
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

  function applyAuthState(authenticated, username) {
    isAuthenticated = authenticated;
    currentUser = authenticated ? (username || "") : "";
    isAdmin = currentUser.toLowerCase() === "admin";
    setPublishingEnabled(authenticated);
    if (authenticated) {
      setAuthStatus("Sessão ativa para " + username + ".", "ok");
      if (loginBtn) loginBtn.hidden = true;
      if (logoutBtn) logoutBtn.hidden = false;
      showAuthError("");
    } else {
      setAuthStatus("Acesso bloqueado. Faça login para publicar.", "warn");
      if (loginBtn) loginBtn.hidden = false;
      if (logoutBtn) logoutBtn.hidden = true;
    }
    refreshList();
  }

  function checkSession() {
    return fetch("/api/session", { credentials: "same-origin" })
      .then(function (res) {
        if (!res.ok) throw new Error("Falha ao validar sessão.");
        return res.json();
      })
      .then(function (data) {
        applyAuthState(!!data.authenticated, data.username || "admin");
      })
      .catch(function () {
        applyAuthState(false, "admin");
      });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      showAuthError("");
      var username = authUserInput.value.trim();
      var password = authPassInput.value;
      if (!username || !password) {
        showAuthError("Informe usuário e senha.");
        return;
      }
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = "Entrando...";
      }
      fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: username, password: password }),
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Usuário ou senha inválidos.");
          return res.json();
        })
        .then(function (data) {
          applyAuthState(true, data.username || username);
          authPassInput.value = "";
        })
        .catch(function (err) {
          applyAuthState(false, "admin");
          showAuthError(err.message || "Não foi possível autenticar.");
        })
        .finally(function () {
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = "Entrar";
          }
        });
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      fetch("/api/logout", {
        method: "POST",
        credentials: "same-origin",
      })
        .then(function () {
          if (authUserInput) authUserInput.value = "";
          if (authPassInput) authPassInput.value = "";
          applyAuthState(false, "admin");
        })
        .catch(function () {
          applyAuthState(false, "admin");
        });
    });
  }

  setShareUrl();
  setPublishingEnabled(false);
  checkSession();
})();
