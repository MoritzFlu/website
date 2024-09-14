import './App.css';


import theme from './data/MyTheme';
import { ThemeProvider } from '@mui/material/styles';


import HomePage from './components/HomePage/HomePage';

// TODO
// - Graph drawing in network
// - About tab with links
// - Automatically laod publications

// Hover over packet types to get description of protocol

function App() {
  return (
    <div className="App">
      <ThemeProvider theme={theme}>
        <HomePage></HomePage>
      </ThemeProvider>
    </div>

  );
}
export default App;
