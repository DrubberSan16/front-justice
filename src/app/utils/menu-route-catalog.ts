import type { RouteLocationRaw, RouteRecordNormalized, Router } from "vue-router";

const frontViewModules = import.meta.glob("../../views/**/*.vue");
const availableViewFiles = new Set(
  Object.keys(frontViewModules).map((path) =>
    path.replace(/\\/g, "/").replace(/^\.\.\/\.\.\//, "")
  )
);

export type MenuRouteCatalogItem = {
  value: string;
  title: string;
  label: string;
  routeName: string;
  routePath: string;
  viewFile: string;
  viewName: string;
  aliases: string[];
};

export function normalizeMenuRouteKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, "/")
    .trim()
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/^app\//, "")
    .replace(/^src\//, "")
    .replace(/\.vue$/i, "")
    .replace(/[\s_]+/g, "-");
}

function resolveViewFile(route: RouteRecordNormalized): string | null {
  const raw = route.meta?.viewFile;
  if (typeof raw !== "string") return null;
  return raw.replace(/\\/g, "/").replace(/^src\//, "");
}

function buildAliases(route: RouteRecordNormalized, viewFile: string): string[] {
  const viewName = viewFile.split("/").pop() ?? viewFile;
  const viewBaseName = viewName.replace(/\.vue$/i, "");
  const title = typeof route.meta?.title === "string" ? route.meta.title : "";

  return Array.from(
    new Set(
      [
        route.name,
        route.path,
        title,
        viewFile,
        viewName,
        viewBaseName,
      ]
        .map((item) => normalizeMenuRouteKey(item))
        .filter(Boolean)
    )
  );
}

function isMenuAssignableRoute(route: RouteRecordNormalized): boolean {
  if (typeof route.name !== "string") return false;
  if (!route.path.startsWith("/app/")) return false;

  const viewFile = resolveViewFile(route);
  return !!viewFile && availableViewFiles.has(viewFile);
}

export function getMenuRouteCatalog(router: Router): MenuRouteCatalogItem[] {
  return router
    .getRoutes()
    .filter(isMenuAssignableRoute)
    .map((route) => {
      const viewFile = resolveViewFile(route) ?? "";
      const viewName = viewFile.split("/").pop() ?? viewFile;
      const title =
        typeof route.meta?.title === "string" && route.meta.title.trim()
          ? route.meta.title.trim()
          : String(route.name);

      return {
        value: String(route.name),
        title,
        label: `${title} · ${viewName}`,
        routeName: String(route.name),
        routePath: route.path,
        viewFile,
        viewName,
        aliases: buildAliases(route, viewFile),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "es"));
}

export function findMenuRouteByValue(
  router: Router,
  urlComponent: string
): MenuRouteCatalogItem | null {
  const target = normalizeMenuRouteKey(urlComponent);
  if (!target) return null;

  return (
    getMenuRouteCatalog(router).find((item) => item.aliases.includes(target)) ?? null
  );
}

export function coerceMenuComponentValue(
  router: Router,
  urlComponent: string
): string {
  return findMenuRouteByValue(router, urlComponent)?.routeName ?? urlComponent;
}

export function resolveMenuRouteLocation(
  router: Router,
  urlComponent: string
): RouteLocationRaw | null {
  const fromCatalog = findMenuRouteByValue(router, urlComponent);
  if (fromCatalog) {
    return { name: fromCatalog.routeName };
  }

  const target = normalizeMenuRouteKey(urlComponent);
  if (!target) return null;

  const directByName = router
    .getRoutes()
    .find((route) => normalizeMenuRouteKey(route.name) === target);
  if (typeof directByName?.name === "string") {
    return { name: directByName.name };
  }

  const directByPath = router
    .getRoutes()
    .find((route) => normalizeMenuRouteKey(route.path) === target);
  if (typeof directByPath?.name === "string") {
    return { name: directByPath.name };
  }

  return null;
}
