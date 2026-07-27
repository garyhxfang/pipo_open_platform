import { siteUrl, withSiteBase } from "../../../base-path.js";

const contentRoot = document.querySelector("[data-lark-content]");
const syncStatus = document.querySelector("[data-sync-status]");
const syncTime = document.querySelector("[data-sync-time]");
const sourceLinks = document.querySelectorAll("[data-source-link]");
const searchTrigger = document.querySelector("[data-search-trigger]");
const searchDialog = document.querySelector("[data-search-dialog]");
const copyButton = document.querySelector("[data-copy-code]");
const codeBlock = document.querySelector("[data-code-block]");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const output = [];
  let listType = null;

  function closeList() {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      return;
    }

    const heading = line.match(/^(#{3,4})\s+(.+)$/);
    if (heading) {
      closeList();
      output.push(`<h3>${renderInline(heading[2])}</h3>`);
      return;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const nextType = unordered ? "ul" : "ol";
      if (listType !== nextType) {
        closeList();
        listType = nextType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
      return;
    }

    closeList();
    output.push(`<p>${renderInline(line)}</p>`);
  });

  closeList();
  return output.join("");
}

function headingTagForLevel(level) {
  return `h${Math.min(6, Math.max(2, Number(level || 1) + 1))}`;
}

async function loadSyncedContent() {
  try {
    const response = await fetch(siteUrl("docs-content/online-payment.json"), {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unable to load synchronized content");
    const data = await response.json();

    contentRoot.replaceChildren();
    data.sections.forEach((section, index) => {
      const sectionElement = document.createElement("section");
      sectionElement.className = `lark-section lark-level-${section.level || 1}`;
      sectionElement.id = section.id || `lark-section-${index + 1}`;
      const headingTag = headingTagForLevel(section.level);
      sectionElement.innerHTML = `
        <${headingTag}>${escapeHtml(section.title)}</${headingTag}>
        <div class="lark-section-body">${
          withSiteBase(section.html || renderMarkdown(section.markdown || ""))
        }</div>
      `;
      contentRoot.append(sectionElement);
    });

    const syncedDate = new Date(data.syncedAt);
    const sectionCount = data.stats?.sections || data.sections.length;
    const mediaCount = data.stats?.mediaDownloaded || 0;
    syncStatus.textContent = `${data.title} · ${sectionCount} 个章节 · ${mediaCount} 个媒体资源`;
    syncTime.dateTime = data.syncedAt;
    syncTime.textContent = `同步于 ${syncedDate.toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    sourceLinks.forEach((link) => {
      link.href = data.sourceUrl || "#";
    });
  } catch (error) {
    syncStatus.textContent = "暂时无法读取同步内容";
    syncTime.textContent = "请运行内容同步";
    contentRoot.innerHTML = `
      <div class="lark-section">
        <h2>内容尚未同步</h2>
        <p>运行文档同步后，这里会展示飞书中的最新内容。</p>
      </div>
    `;
  }
}

function openSearch() {
  if (!searchDialog.open) searchDialog.showModal();
}

searchTrigger.addEventListener("click", openSearch);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openSearch();
  }
});

searchDialog.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => searchDialog.close());
});

copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(codeBlock.textContent);
  copyButton.textContent = "已复制";
  window.setTimeout(() => {
    copyButton.textContent = "复制";
  }, 1600);
});

const tocLinks = [...document.querySelectorAll(".docs-toc > a")];
const observedSections = tocLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);
    if (!visible) return;
    tocLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`);
    });
  },
  { rootMargin: "-20% 0px -68% 0px" },
);

observedSections.forEach((section) => sectionObserver.observe(section));
loadSyncedContent();
