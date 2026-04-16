import React, { useState, useEffect } from 'react';
import './HomePage.css';
import { Link } from 'react-router-dom';
import trichyCampusImg from './../../assets/trp-home.jpg'; 

// Image URLs
const logoUrl = 'https://logodix.com/logo/1787040.png';
const ramapuramCampusImg = 'https://image-static.collegedunia.com/public/college_data/images/campusimage/15857152965.JPG';

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 3;

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide(prevSlide => (prevSlide + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(slideInterval);
  }, []);

  return (
    // WRAPPER ADDED HERE: This div isolates all styles for this page
    <div className="home-isolation-wrapper">
      
      {/* Background Banner */}
      <div className="banner">
        <div className={`banner-slide ${currentSlide === 0 ? 'active' : ''}`} />
        <div className={`banner-slide ${currentSlide === 1 ? 'active' : ''}`} />
        <div className={`banner-slide ${currentSlide === 2 ? 'active' : ''}`} />
      </div>

      <div className="page-container">
        {/* Header */}
        <header>
          <div className="logo-container">
            <img src={logoUrl} alt="SRM Logo" className="logo" />
            <h1>SRM Institute of Science and Technology</h1>
          </div>
          <nav></nav>
        </header>

        {/* Main Content */}
        <main>
          <div className="portal-container">
            <div className="portal-card" id="rmp-card">
              <div className="card-image-container">
                <img src={ramapuramCampusImg} alt="Ramapuram Campus" />
              </div>
              <div className="card-content">
                <h3>Ramapuram Campus</h3>
                <Link to="/login/rmp-login" className="login-btn">Login</Link>
              </div>
            </div>
            <div className="portal-card" id="trc-card">
              <div className="card-image-container">
                <img src={trichyCampusImg} alt="Trichy Campus" />
              </div>
              <div className="card-content">
                <h3>Trichy Campus</h3>
                <Link to="/login/trp-login" className="login-btn">Login</Link>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer>
          <div className="footer-content">
            <div className="footer-legal">
              <p>© 2025 SRM Institute of Science and Technology. All Rights Reserved.</p>
              <p>
                <a href="#">Privacy Policy</a>
                {' | '}
                <a href="#">Terms of Use</a>
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;