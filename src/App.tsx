import { HandTracker } from "./components/HandTracker";
import { Scene } from "./components/Scene";

function App() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#000",
        overflow: "hidden",
      }}
    >
      <HandTracker />
    </div>
  );
}

export default App;
