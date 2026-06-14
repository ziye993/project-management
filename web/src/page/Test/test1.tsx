import { useNavigate } from "../../Router";

export default function Test1() {
    const { push } = useNavigate();

    return <a href="#" onClick={(e) => { e.stopPropagation(); e.preventDefault(); push("/test2", {}) }}>go 测试2 地址</a>
}