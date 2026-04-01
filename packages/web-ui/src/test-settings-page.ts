import { createSettingsPage } from './features/settings-page/create-settings-page.js';

const openBtn = document.getElementById('open-settings');
const root = document.getElementById('settings-root');

if (openBtn && root) {
  openBtn.addEventListener('click', () => {
    // Mount the settings
    root.innerHTML = ''; // clear
    
    const { element, cleanup } = createSettingsPage({
      onClose: (isDirty) => {
        root.innerHTML = ''; // Unmount
        cleanup.destroy();
      },
      onSave: (data) => {
        console.log('Saved App Settings!', data);
        alert('Settings Saved! Check console.');
      }
    });

    root.appendChild(element);
  });
}
