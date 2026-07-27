import { siteUrl, withSiteBase } from "../base-path.js";

const treeRoot = document.querySelector("[data-wiki-tree]");
const treeSyncTime = document.querySelector("[data-tree-sync-time]");
const documentRoot = document.querySelector("[data-document-content]");
const documentTitle = document.querySelector("[data-doc-title]");
const documentSummary = document.querySelector("[data-doc-summary]");
const breadcrumbRoot = document.querySelector("[data-breadcrumb]");
const syncStatus = document.querySelector("[data-sync-status]");
const syncTime = document.querySelector("[data-sync-time]");
const tocRoot = document.querySelector("[data-page-toc]");
const sourceLinks = document.querySelectorAll("[data-doc-source]");
const rootSourceLinks = document.querySelectorAll("[data-root-source]");
const searchTrigger = document.querySelector("[data-search-trigger]");
const searchDialog = document.querySelector("[data-search-dialog]");
const searchInput = document.querySelector("[data-search-input]");
const searchResults = document.querySelector("[data-search-results]");
const searchClose = document.querySelector("[data-search-close]");

let wikiTree;
let selectedNode;
let selectedPath = [];
let searchableNodes = [];

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function findNodePath(node, token, path = []) {
  const nextPath = [...path, node];
  if (node.nodeToken === token) return nextPath;
  for (const child of node.children || []) {
    const result = findNodePath(child, token, nextPath);
    if (result) return result;
  }
  return null;
}

function flattenTree(node, path = []) {
  const nextPath = [...path, node];
  const rows = [{ node, path: nextPath }];
  for (const child of node.children || []) {
    rows.push(...flattenTree(child, nextPath));
  }
  return rows;
}

function documentHref(node) {
  return siteUrl(`docs/?node=${encodeURIComponent(node.nodeToken)}`);
}

function renderTreeNode(node, depth = 0) {
  const children = node.children || [];
  const isSelected = node.nodeToken === selectedNode?.nodeToken;
  const isAncestor = selectedPath.some(
    (pathNode) => pathNode.nodeToken === node.nodeToken,
  );
  const depthStyle = `style="--tree-depth:${depth}"`;

  if (children.length) {
    const shouldOpen = node.defaultExpanded || isAncestor;
    const label = node.hasContent
      ? `<a class="tree-node-link${isSelected ? " active" : ""}" href="${documentHref(
          node,
        )}" data-tree-link>${escapeHtml(node.title)}</a>`
      : `<span class="tree-node-label${depth === 0 ? " root-label" : ""}">${escapeHtml(
          node.title,
        )}</span>`;
    return `
      <div class="tree-node" ${depthStyle}>
        <details ${shouldOpen ? "open" : ""}>
          <summary>
            <span class="tree-chevron" aria-hidden="true">›</span>
            ${label}
          </summary>
          <div class="tree-children">
            ${children.map((child) => renderTreeNode(child, depth + 1)).join("")}
          </div>
        </details>
      </div>
    `;
  }

  if (!node.hasContent) {
    return `
      <div class="tree-leaf tree-empty" ${depthStyle}>
        <span class="tree-spacer"></span>
        <span>${escapeHtml(node.title)}</span>
        <small>暂无正文</small>
      </div>
    `;
  }

  return `
    <a class="tree-leaf${isSelected ? " active" : ""}" ${depthStyle}
      href="${documentHref(node)}" data-tree-link>
      <span class="tree-spacer"></span>
      <span>${escapeHtml(node.title)}</span>
    </a>
  `;
}

function renderWikiTree() {
  treeRoot.innerHTML = (wikiTree.root.children || [])
    .map((node) => renderTreeNode(node))
    .join("");
  treeRoot.querySelectorAll("[data-tree-link]").forEach((link) => {
    link.addEventListener("click", (event) => event.stopPropagation());
  });
}

function renderBreadcrumb() {
  breadcrumbRoot.innerHTML = selectedPath
    .slice(1)
    .map((node, index) => {
      const visiblePathLength = selectedPath.length - 1;
      const isLast = index === visiblePathLength - 1;
      const label =
        node.hasContent && !isLast
          ? `<a href="${documentHref(node)}">${escapeHtml(node.title)}</a>`
          : `<span>${escapeHtml(node.title)}</span>`;
      return `${index ? "<i>/</i>" : ""}${label}`;
    })
    .join("");
}

function renderPageToc(data) {
  tocRoot.replaceChildren();
  (data.toc || []).forEach((item) => {
    const link = document.createElement("a");
    link.href = `#${item.id}`;
    link.dataset.level = String(item.level);
    link.textContent = item.title;
    tocRoot.append(link);
  });
}

function trimWhiteboardWhitespace(image) {
  if (
    image.dataset.whiteboardTrim ||
    !image.naturalWidth ||
    !image.naturalHeight
  ) {
    return;
  }
  image.dataset.whiteboardTrim = "pending";

  const sampleLimit = 900;
  const sampleScale = Math.min(
    1,
    sampleLimit / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const sampleWidth = Math.max(1, Math.round(image.naturalWidth * sampleScale));
  const sampleHeight = Math.max(1, Math.round(image.naturalHeight * sampleScale));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  try {
    context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        const offset = (y * sampleWidth + x) * 4;
        const alpha = pixels[offset + 3];
        const hasVisibleContent =
          alpha > 20 &&
          (pixels[offset] < 244 ||
            pixels[offset + 1] < 244 ||
            pixels[offset + 2] < 244);
        if (!hasVisibleContent) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      image.dataset.whiteboardTrim = "empty";
      return;
    }

    const padding = Math.max(10, Math.round(Math.min(sampleWidth, sampleHeight) * 0.018));
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(sampleWidth - 1, maxX + padding);
    maxY = Math.min(sampleHeight - 1, maxY + padding);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const retainedArea = (cropWidth * cropHeight) / (sampleWidth * sampleHeight);
    if (retainedArea > 0.94) {
      image.dataset.whiteboardTrim = "not-needed";
      return;
    }

    const sourceCropX = minX / sampleScale;
    const sourceCropY = minY / sampleScale;
    const sourceCropWidth = cropWidth / sampleScale;
    const sourceCropHeight = cropHeight / sampleScale;
    const viewport = document.createElement("div");
    viewport.className = "synced-whiteboard-viewport";
    viewport.style.aspectRatio = `${sourceCropWidth} / ${sourceCropHeight}`;
    image.before(viewport);
    viewport.append(image);
    image.style.width = `${(image.naturalWidth / sourceCropWidth) * 100}%`;
    image.style.transform = `translate(${(-sourceCropX / image.naturalWidth) * 100}%, ${(-sourceCropY / image.naturalHeight) * 100}%)`;
    image.dataset.whiteboardTrim = "applied";
    image.closest(".synced-whiteboard")?.classList.add("synced-whiteboard-cropped");
  } catch {
    image.dataset.whiteboardTrim = "unavailable";
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function normalizePortraitMedia(root) {
  root.querySelectorAll(".synced-media img").forEach((image) => {
    const applyOrientation = () => {
      if (!image.naturalWidth || !image.naturalHeight) return;
      const figure = image.closest(".synced-media");
      if (figure?.classList.contains("synced-whiteboard")) {
        trimWhiteboardWhitespace(image);
        return;
      }
      figure?.classList.toggle(
        "synced-media-portrait",
        image.naturalHeight > image.naturalWidth,
      );
      if (image.naturalHeight > image.naturalWidth) {
        figure
          ?.closest(".synced-grid")
          ?.classList.add("synced-grid-portrait-media");
        figure
          ?.closest(".synced-table th, .synced-table td")
          ?.classList.add("synced-table-cell-portrait");
      }
    };

    if (image.complete && image.naturalWidth) {
      applyOrientation();
    } else {
      image.addEventListener("load", applyOrientation, { once: true });
    }
  });
}

function renderDocumentSections(data) {
  documentRoot.replaceChildren();
  if (!data.sections?.length) {
    documentRoot.innerHTML = `
      <div class="empty-document">
        <strong>该文档当前没有正文</strong>
        <p>它会作为知识库目录节点展示；如有子节点，目录默认保持展开。</p>
      </div>
    `;
    return;
  }

  data.sections.forEach((section, index) => {
    const headingLevel = Math.min(
      6,
      Math.max(2, Number(section.level || 1) + 1),
    );
    const sectionElement = document.createElement("section");
    sectionElement.className = `lark-section lark-level-${section.level || 1}`;
    sectionElement.id = section.id || `lark-section-${index + 1}`;
    sectionElement.innerHTML = `
      <h${headingLevel}>${escapeHtml(section.title)}</h${headingLevel}>
      <div class="lark-section-body">${withSiteBase(section.html || "")}</div>
    `;
    documentRoot.append(sectionElement);
  });
  normalizePortraitMedia(documentRoot);
}

async function loadDocument(node) {
  documentTitle.textContent = node.title;
  documentSummary.textContent = "正文和目录层级均与飞书产品白皮书知识库保持同步。";
  sourceLinks.forEach((link) => {
    link.href = node.sourceUrl;
  });
  renderBreadcrumb();

  if (!node.contentUrl) {
    syncStatus.textContent = "该节点没有可同步的正文";
    syncTime.textContent = "";
    renderDocumentSections({ sections: [], toc: [] });
    renderPageToc({ toc: [] });
    return;
  }

  const response = await fetch(siteUrl(node.contentUrl), { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${node.contentUrl}`);
  const data = await response.json();
  documentTitle.textContent = data.title || node.title;
  syncStatus.textContent = `${data.stats.sections} 个章节 · ${data.stats.mediaDownloaded} 个媒体资源`;
  syncTime.dateTime = data.syncedAt;
  syncTime.textContent = `同步于 ${formatDate(data.syncedAt)}`;
  renderDocumentSections(data);
  renderPageToc(data);
}

function renderSearchResults(query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  const matches = searchableNodes
    .filter(({ node }) => node.hasContent)
    .filter(({ node, path }) => {
      const haystack = `${node.title} ${path.map((item) => item.title).join(" ")}`;
      return !normalizedQuery || haystack.toLowerCase().includes(normalizedQuery);
    })
    .slice(0, 12);

  if (!matches.length) {
    searchResults.innerHTML = '<div class="search-empty">没有找到相关文档</div>';
    return;
  }

  searchResults.innerHTML = matches
    .map(
      ({ node, path }) => `
        <a class="search-result" href="${documentHref(node)}">
          <small>${escapeHtml(path.slice(1, -1).map((item) => item.title).join(" / "))}</small>
          <strong>${escapeHtml(node.title)}</strong>
        </a>
      `,
    )
    .join("");
}

function openSearch() {
  renderSearchResults(searchInput.value);
  if (!searchDialog.open) searchDialog.showModal();
  searchInput.focus();
}

async function initializeDocs() {
  try {
    const response = await fetch(siteUrl("docs-content/wiki-tree.json"), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to load wiki tree");
    wikiTree = await response.json();
    searchableNodes = flattenTree(wikiTree.root);
    const requestedToken = new URLSearchParams(window.location.search).get("node");
    selectedPath =
      (requestedToken && findNodePath(wikiTree.root, requestedToken)) ||
      findNodePath(wikiTree.root, wikiTree.defaultNodeToken) ||
      [wikiTree.root];
    selectedNode = selectedPath.at(-1);

    rootSourceLinks.forEach((link) => {
      link.href = wikiTree.sourceUrl;
    });
    treeSyncTime.dateTime = wikiTree.syncedAt;
    treeSyncTime.textContent = `同步于 ${formatDate(wikiTree.syncedAt)}`;
    renderWikiTree();
    await loadDocument(selectedNode);
  } catch (error) {
    documentTitle.textContent = "暂时无法读取文档";
    syncStatus.textContent = "请先运行飞书知识库同步";
    documentRoot.innerHTML = `
      <div class="empty-document">
        <strong>知识库内容尚未生成</strong>
        <p>运行 npm run prototype:sync-docs 后重试。</p>
      </div>
    `;
  }
}

searchTrigger.addEventListener("click", openSearch);
searchClose.addEventListener("click", () => searchDialog.close());
searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
  if (event.key === "Escape" && searchDialog.open) searchDialog.close();
});

initializeDocs();
