import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { RouterStatus, type _IReductRouter, type _IRouter, type TReductRouter, type TRouter } from "./type";
import { completeRouterConfig, formatRouterAddKey } from "./utils";

type TRouterIds = (string | number)[];

interface IRouterProviderProps {
    router: TRouter,
    children: ReactNode;
}

type TRouterContextValue = {
    routerIds: TRouterIds;
    setRouterIds: React.Dispatch<React.SetStateAction<TRouterIds>>;
    data: any;
    routerReduce: TReductRouter;
    onPopState: Function;
}

const RouterContext = createContext<TRouterContextValue>(null!);


const getNewTargetRouter = (historyIds: (string | number)[], redirect: string) => {
    let routerIds = [];
    if (redirect.startsWith('/')) {
        routerIds = [...redirect.slice(1, redirect.length).split("/")]
    } else {
        routerIds = [...historyIds, ...redirect.split('/').filter(Boolean)]
    }
    return routerIds.length > 1 ? routerIds.filter(Boolean) : routerIds
}
// 路由查找函数
const findRouter = (routerReduce: TReductRouter, routerIds: (string | number)[], historyIds: (string | number)[], originRouterReduct: TReductRouter): { type: RouterStatus, pathIds: (string | number)[] } => {
    const [pathId, ...otherPaths] = routerIds;
    if (!otherPaths?.length && routerReduce[pathId] && !routerReduce[pathId]?.redirect) {
        return { type: RouterStatus.OK, pathIds: [...historyIds, pathId] };
    } else if (routerReduce[pathId]?.children && !!otherPaths.length) {
        return findRouter(routerReduce[pathId]?.children, otherPaths, [...historyIds, pathId], originRouterReduct);
    } else if (routerReduce[pathId] && !otherPaths.length && routerReduce[pathId]?.redirect) {
        const newIds = getNewTargetRouter([...historyIds, pathId], routerReduce[pathId]?.redirect);
        return findRouter(originRouterReduct, newIds, [], originRouterReduct)
    } else if (!routerReduce[pathId] && !!historyIds.length) {
        return { type: RouterStatus.PARTIAL_MATCH, pathIds: [...historyIds, pathId] };
    } else {
        return { type: RouterStatus.NOT_FOUND, pathIds: [...historyIds, pathId] };
    }
};

const RouterProvider = (props: IRouterProviderProps) => {
    const router = [...props.router];
    const [routerIds, setRouterIds] = useState<TRouterIds>([]);

    const data = useRef<any>(null);
    const routerReduce = useMemo(() => {
        const nRouter = completeRouterConfig(router);
        const nfRouter = formatRouterAddKey(nRouter);
        return nfRouter
    }, [router]);

    const onPopState = useCallback((url?: string) => {
        if (typeof url === undefined || url === null) return
        const pathname = window.location.pathname;
        const _routerids = getNewTargetRouter([...routerIds], url || pathname)
        const routerRes = findRouter(routerReduce, _routerids, [], routerReduce);
        // console.log(routerRes, 'routerRes', _routerids)
        if (routerRes?.type === RouterStatus.OK) {
            setRouterIds(routerRes.pathIds);
        } else setRouterIds([routerRes?.type]);
        window.history.pushState({}, "", "/" + routerRes.pathIds.join("/"));
    }, []);
    useEffect(() => {
        const pathname = window.location.pathname;
        onPopState(pathname)
    }, []);

    useEffect(() => {
        const onUrlChange = () => {
            onPopState();
        };

        window.addEventListener('popstate', onUrlChange);
        window.addEventListener('hashchange', onUrlChange);

        return () => {
            window.removeEventListener('popstate', onUrlChange);
            window.removeEventListener('hashchange', onUrlChange);
        };
    }, []);

    return <RouterContext.Provider value={{ routerIds, setRouterIds, data, routerReduce, onPopState }}>
        {props.children}
    </RouterContext.Provider>
}

interface IProps {
    router?: TReductRouter;
    level: number;
    children?: any;
}

function RouterItem(props: IProps) {
    const { router, level } = props;
    const { routerIds } = useContext(RouterContext);
    if (!router) return <></>;
    const currentPath = routerIds[level];
    const currentRouter = router?.[currentPath];
    const Layout = router?.[currentPath]?.components ?? (({ children }: any) => children ?? <></>);
    if (routerIds.length - 1 === level) {
        return <Layout />
    }

    return <Layout>
        <RouterItem router={currentRouter?.children} level={level + 1} />
    </Layout>
}



const Routers = () => {
    const { routerReduce, } = useContext(RouterContext);

    return <RouterItem level={0} router={routerReduce} />
}

export function useNavigate() {
    const { data, onPopState } = useContext(RouterContext);

    return {
        push: (url: string, state?: any) => {
            onPopState(url);
            if (state) {
                data.current = state;
            }
        },
        state: data.current
    }
}

export default function Router(props: { router: TRouter }) {
    const { router } = props;
    return <RouterProvider router={[...router]}>
        <Routers />
    </RouterProvider>
}