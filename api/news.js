const { put, del, list } = require("@vercel/blob");

const NEWS_BLOB_PATH = "mural-db/news.json";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function json(res, status, payload) {
  return res.status(status).json(payload);
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (err) {
      return {};
    }
  }
  return req.body;
}

function isFresh(publishedAt) {
  const t = new Date(publishedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= WEEK_MS;
}

function sortDesc(a, b) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

function sanitizeItem(item) {
  return {
    id: Number(item.id),
    author: String(item.author || "").trim(),
    title: String(item.title || "").trim(),
    content: String(item.content || "").trim(),
    publishedAt: item.publishedAt,
    attachments: Array.isArray(item.attachments) ? item.attachments : [],
  };
}

function normalizeItems(items) {
  return (Array.isArray(items) ? items : [])
    .map(sanitizeItem)
    .filter((it) => it.id > 0 && it.title && it.content && it.author && isFresh(it.publishedAt))
    .sort(sortDesc);
}

async function readNewsBlobJson() {
  const listed = await list({ prefix: NEWS_BLOB_PATH, limit: 1 });
  const found = listed && Array.isArray(listed.blobs) ? listed.blobs[0] : null;
  if (!found || !found.url) return [];
  const res = await fetch(found.url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json().catch(function () {
    return [];
  });
  return normalizeItems(data);
}

async function writeNewsBlobJson(items) {
  const normalized = normalizeItems(items);
  await put(NEWS_BLOB_PATH, JSON.stringify(normalized), {
    access: "public",
    contentType: "application/json; charset=utf-8",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return normalized;
}

function safeExt(name) {
  const n = String(name || "");
  const i = n.lastIndexOf(".");
  if (i === -1) return "";
  return n.slice(i).toLowerCase().replace(/[^a-z0-9.]/g, "");
}

function slugName(name) {
  return String(name || "arquivo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 80);
}

function toBufferFromBase64(att) {
  return Buffer.from(String(att.dataBase64 || ""), "base64");
}

async function ensureBlobAttachment(att, newsId) {
  if (att && att.url) {
    return {
      name: String(att.name || "arquivo"),
      mimeType: String(att.mimeType || "application/octet-stream"),
      url: String(att.url),
    };
  }

  if (!att || !att.dataBase64) return null;
  const name = String(att.name || "arquivo");
  const mimeType = String(att.mimeType || "application/octet-stream");
  const ext = safeExt(name) || "";
  const key = `mural/${newsId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${slugName(name)}${ext && !name.toLowerCase().endsWith(ext) ? ext : ""}`;
  const blob = await put(key, toBufferFromBase64(att), {
    access: "public",
    contentType: mimeType,
    addRandomSuffix: false,
  });
  return {
    name,
    mimeType,
    url: blob.url,
  };
}

async function normalizeAttachmentsForSave(attachments, newsId) {
  const listItems = Array.isArray(attachments) ? attachments : [];
  const out = [];
  for (const att of listItems) {
    const normalized = await ensureBlobAttachment(att, newsId);
    if (normalized) out.push(normalized);
  }
  return out;
}

function getBlobUrls(attachments) {
  const listItems = Array.isArray(attachments) ? attachments : [];
  return listItems
    .map((att) => String(att && att.url ? att.url : ""))
    .filter((url) => /^https?:\/\//.test(url));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const items = await readNewsBlobJson();
      return json(res, 200, { items });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const author = String(body.author || "").trim();
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();
      const attachments = Array.isArray(body.attachments) ? body.attachments : [];

      if (!author || !title || !content) {
        return json(res, 400, { error: "Autor, título e conteúdo são obrigatórios." });
      }

      const items = await readNewsBlobJson();
      const nextId = items.reduce((max, it) => (it.id > max ? it.id : max), 0) + 1;
      const normalizedAttachments = await normalizeAttachmentsForSave(attachments, nextId);
      items.unshift({
        id: nextId,
        author,
        title,
        content,
        publishedAt: new Date().toISOString(),
        attachments: normalizedAttachments,
      });
      const saved = await writeNewsBlobJson(items);
      return json(res, 200, { items: saved });
    }

    if (req.method === "PUT") {
      const body = parseBody(req);
      const id = Number(body.id);
      const author = String(body.author || "").trim();
      const title = String(body.title || "").trim();
      const content = String(body.content || "").trim();
      const attachments = Array.isArray(body.attachments) ? body.attachments : [];

      if (!id || !author || !title || !content) {
        return json(res, 400, { error: "ID, autor, título e conteúdo são obrigatórios." });
      }

      const items = await readNewsBlobJson();
      const idx = items.findIndex((it) => it.id === id);
      if (idx === -1) {
        return json(res, 404, { error: "Notícia não encontrada." });
      }

      const oldUrls = getBlobUrls(items[idx].attachments);
      const normalizedAttachments = await normalizeAttachmentsForSave(attachments, id);
      const newUrls = new Set(getBlobUrls(normalizedAttachments));
      const toDelete = oldUrls.filter((url) => !newUrls.has(url));
      if (toDelete.length > 0) {
        await Promise.allSettled(toDelete.map((url) => del(url)));
      }

      items[idx] = {
        ...items[idx],
        author,
        title,
        content,
        attachments: normalizedAttachments,
      };
      const saved = await writeNewsBlobJson(items);
      return json(res, 200, { items: saved });
    }

    if (req.method === "DELETE") {
      const id = Number(req.query && req.query.id);
      if (!id) {
        return json(res, 400, { error: "Informe o ID da notícia para excluir." });
      }

      const items = await readNewsBlobJson();
      const deleting = items.find((it) => it.id === id);
      const filtered = items.filter((it) => it.id !== id);
      if (deleting) {
        const urls = getBlobUrls(deleting.attachments);
        if (urls.length > 0) {
          await Promise.allSettled(urls.map((url) => del(url)));
        }
      }
      const saved = await writeNewsBlobJson(filtered);
      return json(res, 200, { items: saved });
    }

    res.setHeader("Allow", "GET,POST,PUT,DELETE");
    return json(res, 405, { error: "Método não permitido." });
  } catch (err) {
    return json(res, 500, {
      error:
        "Falha ao acessar armazenamento compartilhado. Verifique a integração do Vercel Blob.",
      details: err && err.message ? err.message : "Erro desconhecido.",
    });
  }
};
