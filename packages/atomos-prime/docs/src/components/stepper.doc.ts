import { defineAtpStepper } from '../../../src/features/stepper/atp-stepper/atp-stepper.js'
import { createAtpStep } from '../../../src/features/stepper/create-atp-step.js'
import { createAtpStepperTab } from '../../../src/features/stepper/create-atp-stepper-tab.js'
import type { DocDefinition } from '../types.js'

defineAtpStepper();
createAtpStep();
createAtpStepperTab();

export interface StepperState {
  currentStepId: number;
  enableFooter: boolean;
}

export const stepperDoc: DocDefinition<StepperState> = {
  id: 'stepper',
  category: 'Structural / Layout',
  title: 'Stepper (Web Components)',
  description: 'Native web components <atp-stepper>, <atp-step>, and <atp-stepper-tab> for multi-stage forms and sequential layouts.',
  defaultState: {
    currentStepId: 1,
    enableFooter: true
  },
  controls: [
    { key: 'currentStepId', label: 'Current Step', type: 'number' },
    { key: 'enableFooter', label: 'Enable Built-in Footer', type: 'boolean' }   
  ],
  renderPreview: (state) => {
    const stepper = document.createElement('atp-stepper');
    stepper.setAttribute('current-step-id', state.currentStepId.toString());    
    if (state.enableFooter) stepper.setAttribute('enable-footer', 'true');      
    stepper.style.cssText = 'width: 500px; max-width: 90vw; background: var(--vbs-bg-panel, #1e293b); border: 1px solid var(--vbs-border, #334155); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; min-height: 300px;';

    // Step 1
    const p1 = document.createElement('atp-step');
    p1.setAttribute('step-id', '1');
    p1.setAttribute('label', 'Personal Information');
    p1.innerHTML = '<div style="padding: 2rem; color: var(--vbs-text-primary, #fff);">Form for your Name, Email, and Phone Number goes here.</div>';

    // Step 2
    const p2 = document.createElement('atp-step');
    p2.setAttribute('step-id', '2');
    p2.setAttribute('label', 'Shipping Details');
    p2.innerHTML = '<div style="padding: 2rem; color: var(--vbs-text-primary, #fff);">Form for your address and delivery options goes here.</div>';

    // Step 3
    const p3 = document.createElement('atp-step');
    p3.setAttribute('step-id', '3');
    p3.setAttribute('label', 'Confirmation');
    p3.innerHTML = '<div style="padding: 2rem; color: var(--vbs-text-primary, #fff);">Review all details before finalizing.</div>';

    stepper.appendChild(p1);
    stepper.appendChild(p2);
    stepper.appendChild(p3);

    return {
      element: stepper,
      cleanup: {
        destroy: () => {
          stepper.remove();
        }
      }
    };
  },
  renderCode: (state) => {
    return `import { defineAtpStepper, createAtpStep, createAtpStepperTab } from '@atomos-web/prime';

// Only needed once per application to define the Web Components
defineAtpStepper();
createAtpStep();
createAtpStepperTab();

const html = \`<atp-stepper current-step-id="${state.currentStepId}" ${state.enableFooter ? 'enable-footer' : ''}>
  <atp-step step-id="1" label="Personal Information">
    First step content...
  </atp-step>
  <atp-step step-id="2" label="Shipping Details">
    Second step content...
  </atp-step>
  <atp-step step-id="3" label="Confirmation">
    Final step content...
  </atp-step>
</atp-stepper>\`;

document.body.insertAdjacentHTML('beforeend', html);`;
  }
};