import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StudentDetailPage from './pages/StudentDetailPage';
import CompaniesPage from './pages/CompaniesPage';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="header">
          <h1>就活サポートシステム - 教員側</h1>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/students/:studentId" element={<StudentDetailPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <p>© 2024 就活サポートシステム</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
