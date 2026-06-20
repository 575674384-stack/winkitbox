const textErrorPatterns = [
  /file\s+not\s+exist/i,
  /not\s+found/i,
  /404/i,
  /errorcode/i,
  /errormsg/i
];

const binaryContentTypePattern =
  /application\/(?:x-msdownload|octet-stream|zip|x-7z-compressed|vnd\.microsoft\.portable-executable)|application\/x-msi|application\/x-ms-installer/i;

function getAiCandidateValidationTargets(candidate, context = {}) {
  const install = candidate?.install ?? {};
  const type = String(install.type ?? "").trim();

  if (type === "winget") {
    return [];
  }

  const directUrl = String(install.downloadUrl ?? "").trim();
  if (directUrl) {
    return [{ kind: "downloadUrl", url: directUrl }];
  }

  const assetPattern = String(install.assetPattern ?? "").trim();
  if (!assetPattern) {
    return [];
  }

  let matcher;
  try {
    matcher = new RegExp(assetPattern, "i");
  } catch (error) {
    return [{ kind: "assetPattern", error: `发行版资产匹配规则无效：${error.message}` }];
  }

  const assets = Array.isArray(context.assets) ? context.assets : [];
  const asset = assets.find((item) => matcher.test(String(item?.name ?? "")));
  if (!asset?.downloadUrl) {
    return [{ kind: "assetPattern", error: `没有找到匹配 ${assetPattern} 的 Windows 发行版资产。` }];
  }

  return [{ kind: "assetPattern", url: String(asset.downloadUrl), assetName: String(asset.name ?? "") }];
}

async function validateAiToolCandidate(candidate, context = {}, fetchLike) {
  const install = candidate?.install ?? {};
  const type = String(install.type ?? "").trim();

  if (!type) {
    return invalid("AI 没有返回安装类型。");
  }

  if (type === "winget") {
    const wingetId = String(install.wingetId ?? "").trim();
    return wingetId ? valid() : invalid("AI 选择了 winget 安装，但没有返回 wingetId。");
  }

  if (!["installer", "portable"].includes(type)) {
    return invalid(`AI 返回了不支持的安装类型：${type}`);
  }

  const targets = getAiCandidateValidationTargets(candidate, context);
  if (targets.length === 0) {
    return invalid("AI 没有返回可验证的下载 URL 或发行版资产匹配规则。");
  }

  for (const target of targets) {
    if (target.error) {
      return invalid(target.error);
    }

    const result = await validateDownloadUrl(target.url, fetchLike);
    if (!result.ok) {
      return invalid(
        `${target.assetName ? `发行版资产 ${target.assetName} 的` : ""}下载地址不可用：${result.message}`,
        { target, probe: result }
      );
    }
  }

  return valid();
}

async function validateDownloadUrl(url, fetchLike) {
  const normalizedUrl = String(url ?? "").trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return { ok: false, message: "下载地址必须以 http:// 或 https:// 开头。" };
  }

  if (typeof fetchLike !== "function") {
    return { ok: false, message: "缺少下载地址校验器。" };
  }

  try {
    const head = await fetchLike(normalizedUrl, {
      method: "HEAD",
      redirect: "follow",
      headers: {
        "User-Agent": "WinKitBox/0.1",
        Accept: "*/*"
      }
    });

    if (head?.ok && responseLooksLikeDownload(head)) {
      return { ok: true, status: head.status, contentType: getHeader(head, "content-type") };
    }

    if (head && !shouldRetryWithGet(head)) {
      return {
        ok: false,
        status: head.status,
        message: `HTTP ${head.status || "未知"}`
      };
    }
  } catch {
    // Some hosts reject HEAD. Fall through to a small ranged GET probe.
  }

  try {
    const response = await fetchLike(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "WinKitBox/0.1",
        Accept: "*/*",
        Range: "bytes=0-4095"
      }
    });

    if (!response?.ok) {
      return {
        ok: false,
        status: response?.status,
        message: `HTTP ${response?.status || "未知"}`
      };
    }

    if (responseLooksLikeDownload(response)) {
      return { ok: true, status: response.status, contentType: getHeader(response, "content-type") };
    }

    const text = await safeReadText(response);
    if (text && textErrorPatterns.some((pattern) => pattern.test(text))) {
      return {
        ok: false,
        status: response.status,
        message: compactText(text, 180)
      };
    }

    return { ok: true, status: response.status, contentType: getHeader(response, "content-type") };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "下载地址校验失败。"
    };
  }
}

function responseLooksLikeDownload(response) {
  const contentType = getHeader(response, "content-type");
  const contentLength = Number(getHeader(response, "content-length") ?? 0);

  if (binaryContentTypePattern.test(contentType)) {
    return true;
  }

  return contentLength > 1024 * 1024 && !/^text\/|application\/json/i.test(contentType);
}

function shouldRetryWithGet(response) {
  const status = Number(response?.status ?? 0);
  return !status || [403, 405, 406, 501].includes(status);
}

function getHeader(response, name) {
  const headers = response?.headers;
  if (!headers) {
    return "";
  }

  if (typeof headers.get === "function") {
    return String(headers.get(name) ?? "");
  }

  return String(headers[name] ?? headers[name.toLowerCase()] ?? "");
}

async function safeReadText(response) {
  try {
    if (typeof response.text === "function") {
      return (await response.text()).slice(0, 4096);
    }
  } catch {
    return "";
  }

  return "";
}

function valid(extra = {}) {
  return { ok: true, issues: [], ...extra };
}

function invalid(message, extra = {}) {
  return { ok: false, issues: [message], ...extra };
}

function compactText(value, maxLength) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

module.exports = {
  getAiCandidateValidationTargets,
  validateAiToolCandidate,
  validateDownloadUrl
};
