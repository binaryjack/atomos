import { createSignal } from '../core/create-signal.js';

import { createTypography } from '../features/typography/create-typography.js';
import { createButton } from '../features/button/create-button.js';
import { createInput } from '../features/input/create-input.js';
import { createCheckbox } from '../features/checkbox/create-checkbox.js';
import { createTextarea } from '../features/textarea/create-textarea.js';
import { createDropdown } from '../features/dropdown/create-dropdown.js';
import { createCard } from '../features/card/create-card.js';
import { createAccordion } from '../features/accordion/create-accordion.js';
import { createSkeleton } from '../features/skeleton/create-skeleton.js';
import { createIcon } from '../features/icon/create-icon.js';


import { createPreviewSection } from './create-preview-section.js';
import { createModalDemo } from '../features/modal/create-modal-demo.js';

export const createPreviewPage = function() {
  const container = document.createElement('div');
  const cleanupFunctions: Array<() => void> = [];
  
  // Theme management
  const themeSignal = createSignal<'light' | 'dark'>('light');
  cleanupFunctions.push(() => themeSignal.subscribe(() => {})());
  
  // Apply theme to document
  const applyTheme = (theme: 'light' | 'dark') => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    container.className = `min-h-screen transition-colors ${
      theme === 'dark' 
        ? 'bg-gray-900 text-gray-100' 
        : 'bg-gray-50 text-gray-900'
    }`;
  };
  
  themeSignal.subscribe(applyTheme);
  applyTheme(themeSignal.value);
  
  // Header
  const header = document.createElement('header');
  header.className = 'sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm';
  
  const headerContent = document.createElement('div');
  headerContent.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center';
  
  // Title
  const title = createTypography({
    variant: 'h1',
    children: 'VBS Web UI Components',
    className: 'text-2xl font-bold text-gray-900 dark:text-gray-100'
  });
  headerContent.appendChild(title.element);
  cleanupFunctions.push(title.cleanup.destroy);
  
  // Theme toggle
  const themeToggle = createButton({
    variant: 'outline',
    size: 'sm',
    children: '🌙 Dark',
    onClick: () => {
      const newTheme = themeSignal.value === 'light' ? 'dark' : 'light';
      themeSignal.set(newTheme);
    }
  });
  
  // Update button text based on theme
  themeSignal.subscribe(theme => {
    if (themeToggle.element.textContent !== undefined) {
      themeToggle.element.textContent = theme === 'light' ? '🌙 Dark' : '☀️ Light';
    }
  });
  
  headerContent.appendChild(themeToggle.element);
  cleanupFunctions.push(themeToggle.cleanup.destroy);
  
  header.appendChild(headerContent);
  container.appendChild(header);
  
  // Main content
  const main = document.createElement('main');
  main.className = 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8';
  
  // Typography section
  const typographyComponents = [
    createTypography({ variant: 'h1', children: 'Heading 1', className: 'text-primary-600' }),
    createTypography({ variant: 'h2', children: 'Heading 2', className: 'text-primary-600' }),
    createTypography({ variant: 'h3', children: 'Heading 3', className: 'text-primary-600' }),
    createTypography({ variant: 'p', children: 'This is paragraph text with normal styling.' }),
    createTypography({ variant: 'span', children: 'Span element text', className: 'text-sm text-gray-600 dark:text-gray-400' })
  ];
  
  const typographySection = createPreviewSection({
    title: 'Typography',
    children: typographyComponents.map(c => c.element)
  });
  main.appendChild(typographySection.element);
  cleanupFunctions.push(typographySection.cleanup.destroy);
  typographyComponents.forEach(c => cleanupFunctions.push(c.cleanup.destroy));
  
  // Buttons section
  const buttonComponents: HTMLElement[] = [];
  
  // Create button variants
  ['primary', 'secondary', 'outline', 'ghost', 'danger'].forEach(variant => {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'space-y-2';
    
    const variantLabel = createTypography({
      variant: 'h4',
      children: `${variant.charAt(0).toUpperCase() + variant.slice(1)} Buttons`,
      className: 'text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
    });
    buttonContainer.appendChild(variantLabel.element);
    cleanupFunctions.push(variantLabel.cleanup.destroy);
    
    const buttonRow = document.createElement('div');
    buttonRow.className = 'flex gap-2 flex-wrap';
    
    ['sm', 'md', 'lg'].forEach(size => {
      const button = createButton({
        variant: variant as 'primary',
        size: size as 'sm',
        children: `${size.toUpperCase()}`,
        onClick: () => console.log(`${variant} ${size} clicked`)
      });
      buttonRow.appendChild(button.element);
      cleanupFunctions.push(button.cleanup.destroy);
    });
    
    buttonContainer.appendChild(buttonRow);
    buttonComponents.push(buttonContainer);
  });
  
  const buttonsSection = createPreviewSection({
    title: 'Buttons',
    children: buttonComponents
  });
  main.appendChild(buttonsSection.element);
  cleanupFunctions.push(buttonsSection.cleanup.destroy);
  
  // Input components section
  const inputComponents: HTMLElement[] = [];
  
  // Text inputs
  const textInputContainer = document.createElement('div');
  textInputContainer.className = 'space-y-3';
  
  const textInput = createInput({
    type: 'text',
    placeholder: 'Enter text...',
    className: 'w-full'
  });
  const emailInput = createInput({
    type: 'email', 
    placeholder: 'Enter email...',
    className: 'w-full'
  });
  const passwordInput = createInput({
    type: 'password',
    placeholder: 'Enter password...',
    className: 'w-full'
  });
  
  textInputContainer.appendChild(textInput.element);
  textInputContainer.appendChild(emailInput.element);
  textInputContainer.appendChild(passwordInput.element);
  inputComponents.push(textInputContainer);
  
  cleanupFunctions.push(textInput.cleanup.destroy);
  cleanupFunctions.push(emailInput.cleanup.destroy);
  cleanupFunctions.push(passwordInput.cleanup.destroy);
  
  // Checkbox and textarea
  const checkboxSignal = createSignal(false);
  const checkbox = createCheckbox({
    checked: checkboxSignal,
    onChange: (checked) => checkboxSignal.set(checked)
  });
  
  const checkboxContainer = document.createElement('div');
  checkboxContainer.className = 'flex items-center gap-2';
  checkboxContainer.appendChild(checkbox.element);
  
  const checkboxLabel = createTypography({
    variant: 'span',
    children: 'Accept terms and conditions'
  });
  checkboxContainer.appendChild(checkboxLabel.element);
  inputComponents.push(checkboxContainer);
  
  cleanupFunctions.push(checkbox.cleanup.destroy);
  cleanupFunctions.push(checkboxLabel.cleanup.destroy);
  
  const textarea = createTextarea({
    placeholder: 'Enter multiple lines...',
    rows: 3,
    className: 'w-full'
  });
  inputComponents.push(textarea.element);
  cleanupFunctions.push(textarea.cleanup.destroy);
  
  const dropdown = createDropdown({
    placeholder: 'Select option...',
    options: [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
      { value: 'opt3', label: 'Option 3' }
    ],
    className: 'w-full'
  });
  inputComponents.push(dropdown.element);
  cleanupFunctions.push(dropdown.cleanup.destroy);
  
  const inputsSection = createPreviewSection({
    title: 'Form Controls',
    children: inputComponents
  });
  main.appendChild(inputsSection.element);
  cleanupFunctions.push(inputsSection.cleanup.destroy);
  
  // Icons section  
  const iconComponents: HTMLElement[] = [];
  const iconNames: Array<'check' | 'close' | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'plus' | 'minus' | 'edit' | 'delete' | 'search' | 'menu' | 'settings'> = 
    ['check', 'close', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'plus', 'minus', 'edit', 'delete', 'search', 'menu', 'settings'];
  
  iconNames.forEach(iconName => {
    const iconContainer = document.createElement('div');
    iconContainer.className = 'flex flex-col items-center gap-2 p-4';
    
    const icon = createIcon({
      name: iconName,
      size: 24,
      className: 'text-primary-600'
    });
    
    const label = createTypography({
      variant: 'span',
      children: iconName,
      className: 'text-xs text-center'
    });
    
    iconContainer.appendChild(icon.element);
    iconContainer.appendChild(label.element);
    iconComponents.push(iconContainer);
    
    cleanupFunctions.push(icon.cleanup.destroy);
    cleanupFunctions.push(label.cleanup.destroy);
  });
  
  const iconsSection = createPreviewSection({
    title: 'Icons',
    children: iconComponents
  });
  main.appendChild(iconsSection.element);
  cleanupFunctions.push(iconsSection.cleanup.destroy);
  
  // Cards and skeletons
  const cardComponents: HTMLElement[] = [];
  
  // Sample card
  const cardContent = document.createElement('div');
  const cardText = createTypography({
    variant: 'p', 
    children: 'This is card content with some sample text to show how cards look with content.'
  });
  cardContent.appendChild(cardText.element);
  cleanupFunctions.push(cardText.cleanup.destroy);
  
  const sampleCard = createCard({
    title: 'Sample Card',
    subtitle: 'Card subtitle',
    children: [cardContent],
    shadow: 'md'
  });
  cardComponents.push(sampleCard.element);
  cleanupFunctions.push(sampleCard.cleanup.destroy);
  
  // Skeletons
  const skeletonContainer = document.createElement('div');
  skeletonContainer.className = 'space-y-3';
  
  const textSkeleton = createSkeleton({
    variant: 'text',
    width: '100%'
  });
  const circularSkeleton = createSkeleton({
    variant: 'circular', 
    width: 40,
    height: 40
  });
  const rectSkeleton = createSkeleton({
    variant: 'rectangular',
    width: 200,
    height: 100
  });
  
  skeletonContainer.appendChild(textSkeleton.element);
  skeletonContainer.appendChild(circularSkeleton.element);
  skeletonContainer.appendChild(rectSkeleton.element);
  cardComponents.push(skeletonContainer);
  
  cleanupFunctions.push(textSkeleton.cleanup.destroy);
  cleanupFunctions.push(circularSkeleton.cleanup.destroy);
  cleanupFunctions.push(rectSkeleton.cleanup.destroy);
  
  const cardsSection = createPreviewSection({
    title: 'Cards & Skeletons',
    children: cardComponents
  });
  main.appendChild(cardsSection.element);
  cleanupFunctions.push(cardsSection.cleanup.destroy);
  
  // Accordion
  const accordionContent = document.createElement('div');
  const accordionText = createTypography({
    variant: 'p',
    children: 'This is the accordion content that can be expanded or collapsed. It demonstrates the smooth animation and interactive behavior.'
  });
  accordionContent.appendChild(accordionText.element);
  cleanupFunctions.push(accordionText.cleanup.destroy);
  
  const accordion = createAccordion({
    title: 'Click to expand/collapse',
    children: [accordionContent],
    defaultOpen: false
  });
  
  const accordionSection = createPreviewSection({
    title: 'Interactive Components',
    children: [accordion.element]
  });
  main.appendChild(accordionSection.element);
  cleanupFunctions.push(accordionSection.cleanup.destroy);
  cleanupFunctions.push(accordion.cleanup.destroy);
  
  // Interactive Entity Workspace
  const workspaceContainer = document.createElement('div');
  workspaceContainer.className = 'relative w-full bg-base-50 border border-base-200 rounded-lg overflow-hidden';
  workspaceContainer.style.height = '600px';
  workspaceContainer.style.position = 'relative';

  // 4000×4000 SVG canvas
  const svgCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgCanvas.setAttribute('width', '100%');
  svgCanvas.setAttribute('height', '100%');
  svgCanvas.style.cssText = 'display:block;cursor:default;';

  // Viewport group — all world-space content lives here
  //
  //
  //

  // Pan/zoom viewport — attach wheel/drag to workspaceContainer so the div receives events
  // viewport clean

  // Create interactive entity demo
  //

  workspaceContainer.appendChild(svgCanvas);

  // Add workspace instructions
  const instructionsHeader = document.createElement('div');
  instructionsHeader.className = 'absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded px-3 py-2 text-xs text-base-700 border border-base-200 max-w-md';
  instructionsHeader.style.pointerEvents = 'none';
  instructionsHeader.innerHTML = `
    <div class="font-medium mb-1">Interactive Entity Workspace</div>
    <div class="text-xs opacity-75">• Scroll to zoom • Middle-drag or bg-drag to pan • Drag entities to move • Corner handles to resize • Click anchors to link • ESC to cancel</div>
  `;
  workspaceContainer.appendChild(instructionsHeader);
  
  const workspaceSection = createPreviewSection({
    title: 'Interactive Entity Architecture',
    children: [workspaceContainer]
  });
  main.appendChild(workspaceSection.element);
  cleanupFunctions.push(workspaceSection.cleanup.destroy);

  // ── Modal section ─────────────────────────────────────────────────────────
  const modalDemo = createModalDemo();
  cleanupFunctions.push(modalDemo.cleanup.destroy);

  const modalSection = createPreviewSection({
    title: 'Modal',
    children: [modalDemo.element],
  });
  main.appendChild(modalSection.element);
  cleanupFunctions.push(modalSection.cleanup.destroy);

  container.appendChild(main);

  return {
    element: container,
    cleanup: {
      destroy: () => {
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions.length = 0;
      }
    }
  };
};