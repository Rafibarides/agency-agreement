import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileSignature, 
  faShieldAlt, 
  faChartLine,
  faClipboardList
} from '@fortawesome/free-solid-svg-icons';
import FormPage from './Pages/FormPage';
import AdminPage from './Pages/AdminPage';
import Dashboard from './Pages/Dashboard';
import APFList from './Pages/APFList';
import PinModal from './Components/PinModal';
import './App.css';

const PAGES = {
  FORM: 'form',
  ADMIN: 'admin',
  DASHBOARD: 'dashboard',
  APF: 'apf'
};

//done new

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);
  const [showPinModal, setShowPinModal] = useState(false);
  const [prefillData, setPrefillData] = useState(null);

  const handleAPFClick = () => {
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setCurrentPage(PAGES.APF);
  };

  const handleSelectPrefill = (data) => {
    setPrefillData(data);
    setCurrentPage(PAGES.FORM);
  };

  const handleFormReset = () => {
    setPrefillData(null);
  };

  const renderPage = () => {
    switch (currentPage) {
      case PAGES.ADMIN:
        return <AdminPage />;
      case PAGES.DASHBOARD:
        return <Dashboard />;
      case PAGES.APF:
        return <APFList onSelectAgreement={handleSelectPrefill} />;
      case PAGES.FORM:
      default:
        return <FormPage prefillData={prefillData} onReset={handleFormReset} />;
    }
  };

  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="nav-container">
        <img 
          src={`${import.meta.env.BASE_URL}logo.png`}
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
            className={`nav-link ${currentPage === PAGES.APF ? 'active' : ''}`}
            onClick={handleAPFClick}
          >
            <FontAwesomeIcon icon={faClipboardList} style={{ marginRight: '0.5rem' }} />
            APF
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

      {/* PIN Modal for APF Access */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
        title="Enter PIN for APF Access"
      />
    </div>
  );
}

export default App;
