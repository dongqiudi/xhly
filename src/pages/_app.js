import "@/styles/globals.css";
import 'tdesign-react/dist/tdesign.css'; // 全局引入所有组件样式代码

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
