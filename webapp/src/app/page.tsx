import dynamic from "next/dynamic";

// MainApp uses face-api.js which requires browser APIs — disable SSR
const MainApp = dynamic(() => import("@/components/MainApp"), { ssr: false });

export default function Page() {
  return <MainApp />;
}
