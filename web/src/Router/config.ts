import ChatLayout from "../page/LocalChat/Layout";
import LocalChatHome from "../page/LocalChat/Home";
import LocalChatProfile from "../page/LocalChat/Profile";
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
import Swagger from "../page/swagger/home";
import DataMock from "../page/dataMock";
import GameLayout from "../page/Game/Layout";
import GameHome from "../page/Game/Home";
import SudokuHome from "../page/Game/Sudoku";
import GomokuHome from "../page/Game/Gomoku";
import LogLayout from "../page/Log/Layout";
import LogHome from "../page/Log/Home";
import LogQuery from "../page/Log/Query";
import LogTenants from "../page/Log/Tenants";
import LogWorkspace from "../page/Log/Workspace";
import PlaneEditorHome from "../page/PlaneEditor/Home";
import AuthHome from "../page/Auth/Home";
import AuthUserDetail from "../page/Auth/UserDetail";

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
},{
  path: '/swagger',
  redirect: 'home',
  children: [
    { path: '/home', components: Swagger }
  ]
}, {
  path: '/dataMock',
  redirect: 'home',
  children: [
    { path: '/home', components: DataMock }
  ]
}, {
    path: '/game',
    components: GameLayout,
    redirect: 'home',
    children: [
        { path: '/home', components: GameHome },
        { path: '/sudoku', components: SudokuHome },
        { path: '/gomoku', components: GomokuHome },
    ]
}, {
    path: '/localChat',
    components: ChatLayout,
    redirect: 'home',
    children: [
        { path: '/home', components: LocalChatHome },
        { path: '/profile', components: LocalChatProfile },
    ]
}, {
    path: '/log',
    components: LogLayout,
    redirect: 'home',
    children: [
        { path: '/home', components: LogHome },
        { path: '/query', components: LogQuery },
        { path: '/tenants', components: LogTenants },
        { path: '/workspace', components: LogWorkspace },
    ]
}, {
    path: '/planeEditor',
    redirect: 'home',
    children: [
        { path: '/home', components: PlaneEditorHome }
    ]
}, {
    path: '/auth',
    redirect: 'home',
    children: [
        { path: '/home', components: AuthHome },
        { path: '/detail', components: AuthUserDetail },
    ]
}, {
    path: '/404',
    components: NotFound
}];

export default router;
