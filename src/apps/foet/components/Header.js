import { useAppContext } from '../App';
import './Header.css';

const Header = () => {
  const { isFullscreen, toggleFullscreen } = useAppContext();

  return (
    <header id="mainHeader" className="main-header">
      <div className="header-left">
        <h1 className="portal-title"></h1>
      </div>
      
      <div className="header-right">
        <button 
            onClick={toggleFullscreen}
            className="fullscreen-toggle-btn"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="fullscreen-icon"
            >
              {isFullscreen ? (
                // Exit fullscreen - single diagonal line with inward arrows
                <>
                  <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="11,19 5,19 5,13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="13,5 19,5 19,11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              ) : (
                // Enter fullscreen - single diagonal line with outward arrows
                <>
                  <line x1="5" y1="19" x2="19" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <polyline points="5,13 5,19 11,19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="19,11 19,5 13,5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </>
              )}
            </svg>
          </button>
      </div>
    </header>
  );
};

export default Header;