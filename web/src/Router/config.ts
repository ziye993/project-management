import Layout from "../compomeents/Layout";
import ProjectManage from "../page/Project/Home";
import type { TRouter } from "./type";
import NotFound from "../page/404";
import ZiyeHome from "../page/home";
import ImageHome from "../page/Image/Home";
import TelevisionHome from "../page/Television/Home";
import ServerInfoHome from "../page/ServerInfo/Home";
import LANSharingHome from "../page/LANSharing/Home";
import ConfigHome from "../page/Config/Home";

const router: TRouter = [{
    path: '/',
    components: ZiyeHome,
}, {
    path: '/config',
    redirect: "home",
    children: [
        { path: '/home', components: ConfigHome }
    ]
}, {
    path: '/project',
    components: Layout,
    redirect: "home",
    children: [
        { path: '/home', components: ProjectManage }
    ]
}, {
    path: '/image',
    redirect: 'home',
    children: [
        { path: '/home', components: ImageHome }
    ]
}, {
    path: '/television',
    redirect: 'home',
    children: [
        { path: '/home', components: TelevisionHome }
    ]
}, {
    path: '/serverInfo',
    redirect: 'home',
    children: [
        { path: '/home', components: ServerInfoHome }
    ]
}, {
    path: '/LANSharing',
    redirect: 'home',
    children: [
        { path: '/home', components: LANSharingHome }
    ]
}, {
    path: '/404',
    components: NotFound
}];

export default router;
