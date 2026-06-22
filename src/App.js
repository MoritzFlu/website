import './App.css';

import theme from './data/MyTheme';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import HomePage from './features/home/HomePage';
import DemoPage from './features/demo/DemoPage';

function App() {
  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <Routes>
            <Route path="/"    element={<HomePage />} />
            <Route path="/sim" element={<DemoPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}
export default App;
