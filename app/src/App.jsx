import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileSignature, 
  faShieldAlt, 
  faChartLine,
  faClipboardList,
  faUserTie,
  faUsersCog
} from '@fortawesome/free-solid-svg-icons';
import FormPage from './Pages/FormPage';
import AdminPage from './Pages/AdminPage';
import Dashboard from './Pages/Dashboard';
import APFList from './Pages/APFList';
import HRPage from './Pages/HRPage';
import CoordinatorPage from './Pages/CoordinatorPage';
import RetrievalPage from './Pages/RetrievalPage';
import PinModal from './Components/PinModal';
import HRLoginModal from './Components/HRLoginModal';
import CoordinatorLoginModal from './Components/CoordinatorLoginModal';
import './App.css';

const PAGES = {
  FORM: 'form',
  ADMIN: 'admin',
  DASHBOARD: 'dashboard',
  APF: 'apf',
  HR: 'hr',
  COORDINATOR: 'coordinator',
  RETRIEVAL: 'retrieval'
};

function App() {
  const [currentPage, setCurrentPage] = useState(PAGES.FORM);
  const [previousPage, setPreviousPage] = useState(PAGES.FORM);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showHRLoginModal, setShowHRLoginModal] = useState(false);
  const [showCoordinatorLoginModal, setShowCoordinatorLoginModal] = useState(false);
  const [hrUserEmail, setHRUserEmail] = useState(null);
  const [coordinatorEmail, setCoordinatorEmail] = useState(null);
  const [prefillData, setPrefillData] = useState(null);

  const handleAPFClick = () => {
    setShowPinModal(true);
  };

  const handlePinSuccess = () => {
    setCurrentPage(PAGES.APF);
  };

  const handleHRClick = () => {
    if (hrUserEmail) {
      // Already logged in
      setCurrentPage(PAGES.HR);
    } else {
      setShowHRLoginModal(true);
    }
  };

  const handleHRLoginSuccess = (email) => {
    setHRUserEmail(email);
    setCurrentPage(PAGES.HR);
  };

  const handleHRLogout = () => {
    setHRUserEmail(null);
    setCurrentPage(PAGES.FORM);
  };

  const handleCoordinatorClick = () => {
    if (coordinatorEmail) {
      setCurrentPage(PAGES.COORDINATOR);
    } else {
      setShowCoordinatorLoginModal(true);
    }
  };

  const handleCoordinatorLoginSuccess = (email) => {
    setCoordinatorEmail(email);
    setCurrentPage(PAGES.COORDINATOR);
  };

  const handleCoordinatorLogout = () => {
    setCoordinatorEmail(null);
    setCurrentPage(PAGES.FORM);
  };

  const handleOpenRetrieval = () => {
    setPreviousPage(currentPage);
    setCurrentPage(PAGES.RETRIEVAL);
  };

  const handleCloseRetrieval = () => {
    setCurrentPage(previousPage);
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
        return <AdminPage onOpenRetrieval={handleOpenRetrieval} />;
      case PAGES.DASHBOARD:
        return <Dashboard />;
      case PAGES.APF:
        return <APFList onSelectAgreement={handleSelectPrefill} />;
      case PAGES.HR:
        return <HRPage userEmail={hrUserEmail} onLogout={handleHRLogout} />;
      case PAGES.COORDINATOR:
        return <CoordinatorPage userEmail={coordinatorEmail} onLogout={handleCoordinatorLogout} onOpenRetrieval={handleOpenRetrieval} />;
      case PAGES.RETRIEVAL:
        return <RetrievalPage onBack={handleCloseRetrieval} />;
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
            className={`nav-link ${currentPage === PAGES.HR ? 'active' : ''}`}
            onClick={handleHRClick}
          >
            <FontAwesomeIcon icon={faUserTie} style={{ marginRight: '0.5rem' }} />
            HR
          </button>
          <button
            className={`nav-link ${currentPage === PAGES.COORDINATOR ? 'active' : ''}`}
            onClick={handleCoordinatorClick}
          >
            <FontAwesomeIcon icon={faUsersCog} style={{ marginRight: '0.5rem' }} />
            Coordinator
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
          {/* HR User Avatar - shows when logged in */}
          {hrUserEmail && (
            <div 
              className="nav-avatar"
              title={hrUserEmail}
              onClick={() => setCurrentPage(PAGES.HR)}
            >
              {hrUserEmail.substring(0, 2).toUpperCase()}
            </div>
          )}
          {/* Coordinator Avatar - shows when logged in */}
          {coordinatorEmail && (
            <div 
              className="nav-avatar"
              title={coordinatorEmail}
              onClick={() => setCurrentPage(PAGES.COORDINATOR)}
              style={{ background: 'linear-gradient(135deg, #64B5F6, #42A5F5)' }}
            >
              {coordinatorEmail.substring(0, 2).toUpperCase()}
            </div>
          )}
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

      {/* HR Login Modal */}
      <HRLoginModal
        isOpen={showHRLoginModal}
        onClose={() => setShowHRLoginModal(false)}
        onSuccess={handleHRLoginSuccess}
      />

      {/* Coordinator Login Modal */}
      <CoordinatorLoginModal
        isOpen={showCoordinatorLoginModal}
        onClose={() => setShowCoordinatorLoginModal(false)}
        onSuccess={handleCoordinatorLoginSuccess}
      />
    </div>
  );
}

export default App;
