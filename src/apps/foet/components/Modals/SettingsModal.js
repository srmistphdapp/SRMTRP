import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAppContext } from '../../App';

const SettingsModal = ({ isOpen, onClose }) => {
  const { 
    coordinatorName, 
    coordinatorImage, 
    themes, 
    currentTheme, 
    applyTheme, 
    saveSettings 
  } = useAppContext();

  const [nameInput, setNameInput] = useState(coordinatorName);
  const [imageFile, setImageFile] = useState(null);
  const [imageError, setImageError] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setImageError('');
  };

  const handleSave = () => {
    const success = saveSettings(nameInput, imageFile);
    if (!success && imageFile) {
      setImageError('File must be an image and less than 2MB.');
      return;
    }
    onClose();
  };

  const handleThemeChange = (themeName) => {
    applyTheme(themeName);
  };

  return (
    <div className="modal-overlay flex">
      <div className="modal-content max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-red-600"
          >
            <X className="w-7 h-7" />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Profile Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3 border-b pb-2">Profile</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="coordinatorNameInput" className="block text-sm font-medium mb-1">
                  Coordinator Name
                </label>
                <input 
                  type="text" 
                  id="coordinatorNameInput" 
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="coordinatorImageInput" className="block text-sm font-medium mb-1">
                  Profile Photo
                </label>
                <input 
                  type="file" 
                  id="coordinatorImageInput" 
                  accept="image/png, image/jpeg, image/gif" 
                  className="w-full text-sm text-gray-500"
                  onChange={handleImageChange}
                />
                {imageError && (
                  <p className="text-xs text-red-500 mt-1">{imageError}</p>
                )}
              </div>
            </div>
          </div>

          {/* Appearance Section */}
          <div>
            <h3 className="font-semibold text-lg mb-3 border-b pb-2">Appearance</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(themes).map(([key, theme]) => (
                <div
                  key={key}
                  className={`theme-option p-2 rounded-lg cursor-pointer border-2 transition-all ${
                    currentTheme === key ? 'active border-blue-500 bg-blue-50' : 'border-transparent hover:border-gray-300'
                  }`}
                  onClick={() => handleThemeChange(key)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: theme.colors['--primary-blue'] }}
                    ></div>
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: theme.colors['--secondary-blue'] }}
                    ></div>
                  </div>
                  <p className="text-xs text-center font-medium">{theme.name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-shadow"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;