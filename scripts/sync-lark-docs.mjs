import { execFile } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const configPath = resolve(projectRoot, "prototype/docs-sync.config.json");
const config = JSON.parse(readFileSync(configPath, "utf8"));
const identity = process.env.LARK_SYNC_IDENTITY || "user";
const mediaConcurrency = Number(process.env.LARK_MEDIA_CONCURRENCY || 3);

function parseCliOutput(output) {
  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) throw new Error(`Unexpected lark-cli output: ${output}`);
  return JSON.parse(output.slice(jsonStart));
}

async function runLark(args, cwd = projectRoot) {
  const { stdout } = await execFileAsync("lark-cli", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  const result = parseCliOutput(stdout);
  const succeeded = result.ok === true || result.code === 0;
  if (!succeeded) {
    throw new Error(
      result.error?.message ||
        result.msg ||
        `lark-cli ${args.join(" ")} failed`,
    );
  }
  return result.data;
}

async function fetchDocument(source) {
  return runLark(["docs", "+fetch", "--doc", source, "--as", identity]);
}

function readAttributes(value = "") {
  const attributes = {};
  for (const match of value.matchAll(/([\w-]+)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function collectMedia(markdown) {
  const media = new Map();
  const pattern = /<(image|whiteboard)\b([^>]*)\/>/gi;
  for (const match of markdown.matchAll(pattern)) {
    const type = match[1].toLowerCase();
    const attributes = readAttributes(match[2]);
    if (!attributes.token) continue;
    const key = `${type}:${attributes.token}`;
    media.set(key, {
      key,
      type,
      token: attributes.token,
      width: Number(attributes.width || 0),
      height: Number(attributes.height || 0),
    });
  }
  return [...media.values()];
}

function findCachedMedia(directory, outputName) {
  if (!existsSync(directory)) return null;
  return readdirSync(directory).find(
    (file) => file === outputName || file.startsWith(`${outputName}.`),
  );
}

function findReusableMedia(directory, outputName) {
  const mediaRoot = resolve(projectRoot, "prototype/public/docs-media");
  if (!existsSync(mediaRoot)) return null;
  const pending = [mediaRoot];

  while (pending.length) {
    const currentDirectory = pending.pop();
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      const entryPath = resolve(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (entryPath !== directory) pending.push(entryPath);
      } else if (
        entry.name === outputName ||
        entry.name.startsWith(`${outputName}.`)
      ) {
        return entryPath;
      }
    }
  }
  return null;
}

async function downloadMediaItem(item, directory, publicBaseUrl) {
  const outputName =
    item.type === "whiteboard" ? `whiteboard-${item.token}` : item.token;
  const cachedFile = findCachedMedia(directory, outputName);
  if (cachedFile) {
    return [item.key, `${publicBaseUrl}/${cachedFile}`];
  }

  const reusableFile = findReusableMedia(directory, outputName);
  if (reusableFile) {
    const reusableName = basename(reusableFile);
    copyFileSync(reusableFile, resolve(directory, reusableName));
    process.stdout.write(`  reused ${item.type}: ${reusableName}\n`);
    return [item.key, `${publicBaseUrl}/${reusableName}`];
  }

  const args = [
    "docs",
    "+media-download",
    "--token",
    item.token,
    "--output",
    `./${outputName}`,
    "--as",
    identity,
  ];
  if (item.type === "whiteboard") args.push("--type", "whiteboard");

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const data = await runLark(args, directory);
      const savedFile = basename(data.saved_path);
      process.stdout.write(`  downloaded ${item.type}: ${savedFile}\n`);
      return [item.key, `${publicBaseUrl}/${savedFile}`];
    } catch (error) {
      if (attempt < 4 && /frequency limit|HTTP 429/i.test(error.message)) {
        const retryDelay = attempt * 1800;
        process.stderr.write(
          `  rate limited for ${item.token}; retrying in ${retryDelay}ms…\n`,
        );
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, retryDelay),
        );
        continue;
      }
      process.stderr.write(
        `  unable to download ${item.type} ${item.token}: ${error.message}\n`,
      );
      return [item.key, null];
    }
  }
}

async function mapWithConcurrency(items, concurrency, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function escapeHtml(value = "") {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInline(value = "") {
  let rendered = escapeHtml(value);
  rendered = rendered.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    '<img class="inline-markdown-image" src="$2" alt="$1" loading="lazy">',
  );
  rendered = rendered.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
  );
  rendered = rendered.replace(/`([^`]+)`/g, "<code>$1</code>");
  rendered = rendered.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  rendered = rendered.replace(/~~(.+?)~~/g, "<del>$1</del>");
  return rendered;
}

function resolveProtectedBlocks(html, blocks) {
  let resolved = html;
  for (let pass = 0; pass < 6; pass += 1) {
    const previous = resolved;
    blocks.forEach((block, index) => {
      resolved = resolved.replaceAll(`@@LARK_BLOCK_${index}@@`, block);
    });
    if (resolved === previous) break;
  }
  return resolved;
}

function markdownToHtml(markdown, mediaUrls) {
  const context = { blocks: [] };

  function protect(html) {
    const token = `@@LARK_BLOCK_${context.blocks.length}@@`;
    context.blocks.push(html);
    return `\n${token}\n`;
  }

  function convert(fragment, isRoot = false) {
    let value = fragment || "";

    value = value.replace(
      /<lark-table\b[^>]*>([\s\S]*?)<\/lark-table>/gi,
      (_, tableContent) => {
        const rows = [...tableContent.matchAll(/<lark-tr\b[^>]*>([\s\S]*?)<\/lark-tr>/gi)];
        if (!rows.length) return "";
        const rowHtml = rows
          .map((row, rowIndex) => {
            const cells = [
              ...row[1].matchAll(/<lark-td\b([^>]*)>([\s\S]*?)<\/lark-td>/gi),
            ];
            const cellTag = rowIndex === 0 ? "th" : "td";
            return `<tr>${cells
              .map((cell) => {
                const attributes = readAttributes(cell[1]);
                const colspan = Math.max(1, Number(attributes.colspan || 1));
                const rowspan = Math.max(1, Number(attributes.rowspan || 1));
                return `<${cellTag} colspan="${colspan}" rowspan="${rowspan}">${convert(
                  cell[2],
                )}</${cellTag}>`;
              })
              .join("")}</tr>`;
          })
          .join("");
        return protect(
          `<div class="synced-table-wrap"><table class="synced-table"><tbody>${rowHtml}</tbody></table></div>`,
        );
      },
    );

    value = value.replace(/<grid\b([^>]*)>([\s\S]*?)<\/grid>/gi, (_, attrs, gridContent) => {
      const attributes = readAttributes(attrs);
      const columns = [
        ...gridContent.matchAll(/<column\b[^>]*>([\s\S]*?)<\/column>/gi),
      ];
      if (!columns.length) return convert(gridContent);
      const columnHtml = columns
        .map((column) => `<div class="synced-grid-column">${convert(column[1])}</div>`)
        .join("");
      return protect(
        `<div class="synced-grid" style="--synced-grid-columns:${Number(
          attributes.cols || columns.length,
        )}">${columnHtml}</div>`,
      );
    });

    value = value.replace(
      /<callout\b[^>]*>([\s\S]*?)<\/callout>/gi,
      (_, calloutContent) =>
        protect(`<aside class="synced-callout">${convert(calloutContent)}</aside>`),
    );
    value = value.replace(
      /<quote-container\b[^>]*>([\s\S]*?)<\/quote-container>/gi,
      (_, quoteContent) =>
        protect(`<blockquote class="synced-quote">${convert(quoteContent)}</blockquote>`),
    );

    value = value.replace(/<image\b([^>]*)\/>/gi, (_, attrs) => {
      const attributes = readAttributes(attrs);
      const source = mediaUrls.get(`image:${attributes.token}`);
      if (!source) {
        return protect(
          '<div class="synced-media-missing">图片暂未下载，请在飞书源文档中查看。</div>',
        );
      }
      const naturalWidth = Number(attributes.width || 0);
      const naturalHeight = Number(attributes.height || 0);
      const ratio =
        naturalWidth > 0 && naturalHeight > 0
          ? ` style="aspect-ratio:${naturalWidth}/${naturalHeight}"`
          : "";
      return protect(
        `<figure class="synced-media"${ratio}><img src="${escapeHtml(
          source,
        )}" alt="飞书文档图片" loading="lazy"></figure>`,
      );
    });

    value = value.replace(/<whiteboard\b([^>]*)\/>/gi, (_, attrs) => {
      const attributes = readAttributes(attrs);
      const source = mediaUrls.get(`whiteboard:${attributes.token}`);
      if (!source) {
        return protect(
          '<div class="synced-whiteboard-missing"><span>流程图</span><p>该飞书画板暂未生成预览，请前往源文档查看。</p></div>',
        );
      }
      return protect(
        `<figure class="synced-media synced-whiteboard"><figcaption>飞书画板</figcaption><img src="${escapeHtml(
          source,
        )}" alt="飞书画板预览" loading="lazy"></figure>`,
      );
    });

    value = value.replace(/<file\b([^>]*)\/>/gi, (_, attrs) => {
      const attributes = readAttributes(attrs);
      return protect(
        `<div class="synced-file">附件：${escapeHtml(
          attributes.name || attributes.file_name || "飞书附件",
        )}</div>`,
      );
    });

    value = value
      .replace(/<mention-doc\b[^>]*>([\s\S]*?)<\/mention-doc>/gi, "$1")
      .replace(/<text\b[^>]*>([\s\S]*?)<\/text>/gi, "$1")
      .replace(/<mention-user\b([^>]*)\/>/gi, (_, attrs) => {
        const attributes = readAttributes(attrs);
        return attributes.name ? `@${attributes.name}` : "";
      })
      .replace(/<\/?view\b[^>]*>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s*\{align="[^"]*"\}/g, "")
      .replace(/\n{3,}/g, "\n\n");

    const lines = value.split(/\r?\n/);
    const output = [];
    let listType = null;
    let paragraph = [];
    let codeFence = null;
    let codeLines = [];

    function flushParagraph() {
      if (!paragraph.length) return;
      output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }

    function closeList() {
      if (!listType) return;
      output.push(`</${listType}>`);
      listType = null;
    }

    function flushFlow() {
      flushParagraph();
      closeList();
    }

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const fence = line.match(/^```([\w-]*)/);
      if (fence) {
        if (codeFence !== null) {
          output.push(
            `<pre class="synced-code"><code>${escapeHtml(
              codeLines.join("\n"),
            )}</code></pre>`,
          );
          codeFence = null;
          codeLines = [];
        } else {
          flushFlow();
          codeFence = fence[1] || "text";
        }
        continue;
      }
      if (codeFence !== null) {
        codeLines.push(rawLine);
        continue;
      }
      if (!line) {
        flushFlow();
        continue;
      }
      if (/^@@LARK_BLOCK_\d+@@$/.test(line)) {
        flushFlow();
        output.push(line);
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushFlow();
        const level = Math.min(6, heading[1].length + 1);
        output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        continue;
      }

      const unordered = line.match(/^[-*+]\s+(.+)$/);
      const ordered = line.match(/^\d+[.)]\s+(.+)$/);
      if (unordered || ordered) {
        flushParagraph();
        const nextType = unordered ? "ul" : "ol";
        if (listType !== nextType) {
          closeList();
          listType = nextType;
          output.push(`<${listType}>`);
        }
        output.push(`<li>${renderInline((unordered || ordered)[1])}</li>`);
        continue;
      }

      const quote = line.match(/^>\s*(.+)$/);
      if (quote) {
        flushFlow();
        output.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
        continue;
      }

      closeList();
      paragraph.push(line);
    }

    if (codeFence !== null && codeLines.length) {
      output.push(
        `<pre class="synced-code"><code>${escapeHtml(
          codeLines.join("\n"),
        )}</code></pre>`,
      );
    }
    flushFlow();
    const html = output.join("");
    return isRoot ? resolveProtectedBlocks(html, context.blocks) : html;
  }

  return convert(markdown, true);
}

function createSectionId(title, index) {
  const compactTitle = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return `source-${compactTitle || "section"}-${index + 1}`;
}

function splitFullDocument(markdown, mediaUrls) {
  const lines = markdown.split(/\r?\n/);
  const headingPattern = /^(#{1,6})\s+(.+?)\s*$/;
  const rawSections = [];
  let current = {
    title: "文档说明",
    level: 1,
    body: [],
  };

  for (const line of lines) {
    const heading = line.match(headingPattern);
    if (heading) {
      if (current.body.some((item) => item.trim())) rawSections.push(current);
      current = {
        title: heading[2].trim(),
        level: heading[1].length,
        body: [],
      };
    } else {
      current.body.push(line);
    }
  }
  if (current.body.some((item) => item.trim()) || current.title !== "文档说明") {
    rawSections.push(current);
  }

  return rawSections.map((section, index) => ({
    id: createSectionId(section.title, index),
    title: section.title,
    level: section.level,
    html: markdownToHtml(section.body.join("\n").trim(), mediaUrls),
  }));
}

function hasMeaningfulContent(markdown) {
  if (/<(?:image|whiteboard|lark-table|file)\b/i.test(markdown)) return true;
  return markdown
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\s*_#>`~—–-]/g, "").length > 0;
}

async function prepareDocumentPayload({
  source,
  sourceUrl,
  slug,
  mediaDirectory,
  mediaBaseUrl,
  output,
  nodeToken,
}) {
  const data = await fetchDocument(source);
  const resolvedMediaDirectory = resolve(projectRoot, mediaDirectory);
  mkdirSync(resolvedMediaDirectory, { recursive: true });
  const mediaItems = collectMedia(data.markdown);
  process.stdout.write(
    `Found ${mediaItems.length} media in ${data.title || slug}. Syncing resources…\n`,
  );
  const mediaEntries = await mapWithConcurrency(
    mediaItems,
    mediaConcurrency,
    (item) =>
      downloadMediaItem(item, resolvedMediaDirectory, mediaBaseUrl),
  );
  const mediaUrls = new Map(mediaEntries);
  const sections = splitFullDocument(data.markdown, mediaUrls);
  const meaningfulContent = hasMeaningfulContent(data.markdown);
  const payload = {
    slug,
    nodeToken,
    title: data.title,
    source,
    sourceUrl,
    syncedAt: new Date().toISOString(),
    hasContent: meaningfulContent,
    stats: {
      sections: sections.length,
      mediaFound: mediaItems.length,
      mediaDownloaded: [...mediaUrls.values()].filter(Boolean).length,
    },
    toc: sections
      .filter((section) => section.level <= 2)
      .map(({ id, title, level }) => ({ id, title, level })),
    sections: meaningfulContent ? sections : [],
  };
  const outputPath = resolve(projectRoot, output);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return payload;
}

async function getWikiNode(token) {
  const data = await runLark([
    "wiki",
    "spaces",
    "get_node",
    "--as",
    identity,
    "--params",
    JSON.stringify({ token }),
  ]);
  return data.node;
}

async function listWikiChildren(spaceId, parentNodeToken) {
  const children = [];
  let pageToken = "";

  do {
    const params = {
      space_id: spaceId,
      parent_node_token: parentNodeToken,
      page_size: 50,
    };
    if (pageToken) params.page_token = pageToken;
    const data = await runLark([
      "wiki",
      "nodes",
      "list",
      "--as",
      identity,
      "--params",
      JSON.stringify(params),
    ]);
    children.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : "";
  } while (pageToken);

  return children;
}

async function buildWikiTree(node, spaceId) {
  const children = node.has_child
    ? await listWikiChildren(spaceId, node.node_token)
    : [];
  return {
    nodeToken: node.node_token,
    title: node.title || "未命名文档",
    objToken: node.obj_token,
    objType: node.obj_type,
    sourceUrl:
      node.url ||
      `https://bytedance.larkoffice.com/wiki/${node.node_token}`,
    children: await Promise.all(
      children.map((child) => buildWikiTree(child, spaceId)),
    ),
  };
}

function flattenWikiTree(root) {
  const nodes = [];
  function visit(node, depth, ancestors) {
    nodes.push({ node, depth, ancestors });
    node.children.forEach((child) =>
      visit(child, depth + 1, [...ancestors, node]),
    );
  }
  visit(root, 0, []);
  return nodes;
}

function serializeWikiTree(node) {
  return {
    nodeToken: node.nodeToken,
    title: node.title,
    objType: node.objType,
    sourceUrl: node.sourceUrl,
    hasContent: node.hasContent,
    isContainer: node.isContainer,
    defaultExpanded: node.defaultExpanded,
    contentUrl: node.contentUrl,
    children: node.children.map(serializeWikiTree),
  };
}

async function syncWikiRoot(documentConfig) {
  process.stdout.write(
    `Reading wiki tree from ${documentConfig.rootWikiToken}…\n`,
  );
  const rootNode = await getWikiNode(documentConfig.rootWikiToken);
  const tree = await buildWikiTree(rootNode, rootNode.space_id);
  const flatNodes = flattenWikiTree(tree);
  const contentDirectory = documentConfig.contentDirectory;
  const excludedContentNodeTokens = new Set(
    documentConfig.excludedContentNodeTokens || [],
  );

  for (const { node } of flatNodes) {
    if (excludedContentNodeTokens.has(node.nodeToken)) {
      process.stdout.write(
        `Keeping wiki document empty by configuration: ${node.title}…\n`,
      );
      node.hasContent = false;
      node.contentUrl = null;
      continue;
    }

    const supportsDocumentContent = ["docx", "doc"].includes(node.objType);
    if (!supportsDocumentContent) {
      node.hasContent = false;
      node.contentUrl = null;
      continue;
    }

    process.stdout.write(`Syncing wiki document: ${node.title}…\n`);
    const contentFile = `${node.nodeToken}.json`;
    const payload = await prepareDocumentPayload({
      source: node.objToken,
      sourceUrl: node.sourceUrl,
      slug: node.nodeToken,
      nodeToken: node.nodeToken,
      mediaDirectory: documentConfig.mediaDirectory,
      mediaBaseUrl: documentConfig.mediaBaseUrl,
      output: `${contentDirectory}/${contentFile}`,
    });
    node.hasContent = payload.hasContent;
    node.contentUrl = `/${contentDirectory
      .replace(/^prototype\/public\//, "")
      .replace(/\/+$/, "")}/${contentFile}`;
  }

  for (const { node } of [...flatNodes].reverse()) {
    node.isContainer = !node.hasContent && node.children.length > 0;
    node.defaultExpanded = node.isContainer;
  }

  const firstContentNode = flatNodes.find(({ node }) => node.hasContent)?.node;
  const treePayload = {
    title: tree.title,
    rootWikiToken: tree.nodeToken,
    sourceUrl: documentConfig.sourceUrl,
    syncedAt: new Date().toISOString(),
    defaultNodeToken: firstContentNode?.nodeToken || null,
    stats: {
      nodes: flatNodes.length,
      documents: flatNodes.filter(({ node }) => node.hasContent).length,
      containers: flatNodes.filter(({ node }) => node.isContainer).length,
    },
    root: serializeWikiTree(tree),
  };
  const treeOutputPath = resolve(projectRoot, documentConfig.treeOutput);
  mkdirSync(dirname(treeOutputPath), { recursive: true });
  writeFileSync(
    treeOutputPath,
    `${JSON.stringify(treePayload, null, 2)}\n`,
    "utf8",
  );
  process.stdout.write(
    `Synced wiki tree: ${treePayload.stats.nodes} nodes, ${treePayload.stats.documents} content documents, ${treePayload.stats.containers} expanded containers.\n`,
  );
}

async function syncStandaloneDocument(documentConfig) {
  process.stdout.write(`Fetching ${documentConfig.slug} from Lark…\n`);
  const payload = await prepareDocumentPayload({
    source: documentConfig.source,
    sourceUrl: documentConfig.sourceUrl || documentConfig.source,
    slug: documentConfig.slug,
    mediaDirectory:
      documentConfig.mediaDirectory ||
      `prototype/public/docs-media/${documentConfig.slug}`,
    mediaBaseUrl:
      documentConfig.mediaBaseUrl || `/docs-media/${documentConfig.slug}`,
    output: documentConfig.output,
  });
  process.stdout.write(
    `Synced ${payload.title}: ${payload.stats.sections} sections, ${payload.stats.mediaDownloaded}/${payload.stats.mediaFound} media -> ${documentConfig.output}\n`,
  );
}

for (const documentConfig of config.documents) {
  if (documentConfig.kind === "wiki-tree") {
    await syncWikiRoot(documentConfig);
  } else {
    await syncStandaloneDocument(documentConfig);
  }
}
