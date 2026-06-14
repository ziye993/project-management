import type { TReductRouter, TRouter } from "./type";

export function completeRouterConfig(router: TRouter): TRouter {

    return router.map?.(_ => {
        return {
            ..._,
            path: _.path.replace(/\//g, ''),
            components: _.components,
            children: _.children ? completeRouterConfig(_.children,) : undefined,
        }
    });
}

export function formatRouterAddKey(router: TRouter): TReductRouter {
    return router.reduce((prev, item) => {
        return { ...prev, [item.path]: { ...item, children: item.children ? formatRouterAddKey(item.children) : undefined } }
    }, {})
}

export function getComponentsToRouter() { }

export const resolvePath = (path: string) => {
    const currentPath = window.location.pathname + ''; // 获取当前路径

    if (path.startsWith('/')) {
        return "/" + (currentPath + path).split("/").filter(Boolean).join("/");
    }
    if (path.startsWith('./')) {
        let currentParts = currentPath.split('/').filter(Boolean);
        currentParts?.pop()
        const targetPaths = path.split('/').filter(_ => _ !== '.' && !!_);
        return [...currentParts, ...targetPaths].join("/")
    }
    let currentPaths = currentPath.split('/').filter(Boolean);
    const paths = path.split("/").filter(Boolean);
    return [...currentPaths, ...paths].join("/")
};

// console.log(resolvePath('./f'));   // /a/b/c/d/e/f
// console.log(resolvePath('/f'));    // /f
// console.log(resolvePath('../f'));  // /a/b/c/f
// console.log(resolvePath('f'));     // /a/b/c/d/e/f

