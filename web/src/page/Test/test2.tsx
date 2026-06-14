import { useNavigate } from "../../Router"

export default function Test2() {

    const { push } = useNavigate();
    return <a href="#" onClick={(e) => { e.stopPropagation(); e.preventDefault(); push("/test1", {}) }}>go 测试1 地址</a>
}