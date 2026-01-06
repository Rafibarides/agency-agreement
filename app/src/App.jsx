import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileSignature, 
  faShieldAlt, 
  faChartLine 
} from '@fortawesome/free-solid-svg-icons';
import FormPage from './Pages/FormPage';
import AdminPage from './Pages/AdminPage';
import Dashboard from './Pages/Dashboard';
import './App.css';

const PAGES = {
  FORM: 'form',
  ADMIN: 'admin',
  DASHBOARD: 'dashboard'
};

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.ADMIN:
        return <AdminPage />;
      case PAGES.DASHBOARD:
        return <Dashboard />;
      case PAGES.FORM:
      default:
        return <FormPage />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="nav-container">
        <img 
          src="/logo.png" 
          alt="Wellbound Logo" 
          className="nav-logo"
          onClick={() => setCurrentPage(PAGES.FORM)}
          style={{ cursor: 'pointer' }}
        />
        <div className="nav-links">
          <button
            className={`nav-link ${currentPage === PAGES.FORM ? 'active' : ''}`}
            onClick={() => setCurrentPage(PAGES.FORM)}
          >
            <FontAwesomeIcon icon={faFileSignature} style={{ marginRight: '0.5rem' }} />
            Form
          </button>
          <button
            className={`nav-link ${currentPage === PAGES.DASHBOARD ? 'active' : ''}`}
            onClick={() => setCurrentPage(PAGES.DASHBOARD)}
          >
            <FontAwesomeIcon icon={faChartLine} style={{ marginRight: '0.5rem' }} />
            Dashboard
          </button>
          <button
            className={`nav-link ${currentPage === PAGES.ADMIN ? 'active' : ''}`}
            onClick={() => setCurrentPage(PAGES.ADMIN)}
          >
            <FontAwesomeIcon icon={faShieldAlt} style={{ marginRight: '0.5rem' }} />
            Admin
          </button>
        </div>
      </nav>

      {/* Main Content */}
      {renderPage()}
    </div>
  );
}

export default App;
