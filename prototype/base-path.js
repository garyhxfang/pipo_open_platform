const basePath = import.meta.env.BASE_URL;

export function siteUrl(path = "") {
  if (
    !path ||
    path.startsWith("#") ||
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:")
  ) {
    return path;
  }

  return `${basePath}${path.replace(/^\/+/, "")}`;
}

export function withSiteBase(html = "") {
  return html.replace(
    /\b(src|href)="\/(?!\/)([^"]*)"/g,
    (_, attribute, path) => `${attribute}="${siteUrl(path)}"`,
  );
}

document.querySelectorAll('a[href^="/"]').forEach((link) => {
  link.setAttribute("href", siteUrl(link.getAttribute("href")));
});
