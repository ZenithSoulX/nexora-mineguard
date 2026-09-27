import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./Dashboard";
import SensorNodes from "./SensorNodes";
import LiveMap from "./LiveMap";
import Alerts from "./Alerts";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/Nodes" element={<SensorNodes />} />
        <Route path="/LiveMap" element={<LiveMap />} />
        <Route path="/Alerts" element={<Alerts />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;