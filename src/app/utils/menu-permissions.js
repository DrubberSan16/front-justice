const defaultPerms = {
    isReaded: false,
    isCreated: false,
    isEdited: false,
    permitDeleted: false,
    isReports: false,
    reportsPermit: "{}",
};
function normalize(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/^\/+/, "")
        .replace(/^app\//, "")
        .replace(/[\s_]+/g, "-");
}
export function findMenuNodeByComponent(tree, urlComponent) {
    const target = normalize(urlComponent);
    for (const node of tree) {
        if (normalize(node.urlComponent) === target)
            return node;
        if (node.children?.length) {
            const found = findMenuNodeByComponent(node.children, urlComponent);
            if (found)
                return found;
        }
    }
    return null;
}
export function getPermissionsForComponent(tree, urlComponent) {
    const node = findMenuNodeByComponent(tree, urlComponent);
    return node?.permissions ?? defaultPerms;
}
export function getPermissionsForAnyComponent(tree, urlComponents) {
    for (const name of urlComponents) {
        const node = findMenuNodeByComponent(tree, name);
        if (node?.permissions)
            return node.permissions;
    }
    return defaultPerms;
}
