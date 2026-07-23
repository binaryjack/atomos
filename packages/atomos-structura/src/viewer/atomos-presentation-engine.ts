import { renderToSVG } from '@atomos-web/renderer-svg';
import type { ThemeMode } from '@atomos-web/renderer-svg';
import type { SchemaGraphKernel } from '../core/create-schema-graph-kernel.js';

export interface PresentationOptions {
    theme?: ThemeMode;
    padding?: number;
    responsive?: boolean;
}

export class AtomosPresentationEngine {
    private container: HTMLElement;
    private kernel: SchemaGraphKernel;
    private options: PresentationOptions;
    private unsubscribe?: () => void;

    constructor(container: HTMLElement, kernel: SchemaGraphKernel, options: PresentationOptions = {}) {
        this.container = container;
        this.kernel = kernel;
        this.options = {
            theme: 'sovereign-dark',
            padding: 40,
            responsive: true,
            ...options
        };
        
        // Add minimal CSS for the wrapper if responsive
        if (this.options.responsive) {
            this.container.style.width = '100%';
            this.container.style.height = '100%';
            this.container.style.overflow = 'hidden';
            this.container.style.display = 'flex';
            this.container.style.alignItems = 'center';
            this.container.style.justifyContent = 'center';
        }

        this.render();
        this.unsubscribe = this.kernel.subscribe(() => {
            this.render();
        });
    }

    private render() {
        const snapshot = this.kernel.getSnapshot();
        const svgString = renderToSVG(snapshot, {
            theme: this.options.theme || 'sovereign-dark',
            padding: this.options.padding || 40,
            responsive: this.options.responsive ?? true
        });

        
        // Enhance SVG with micro-animations for data flow
        const enhancedSvg = this.addMicroAnimations(svgString);
        this.container.innerHTML = enhancedSvg;
    }

    private addMicroAnimations(svgString: string): string {
        // We can inject CSS animations directly into the SVG
        const style = `
        <style>
            .atomos-edges path {
                stroke-dasharray: 8 4;
                animation: flow 2s linear infinite;
            }
            @keyframes flow {
                from { stroke-dashoffset: 24; }
                to { stroke-dashoffset: 0; }
            }
        </style>`;
        
        return svgString.replace('</defs>', `</defs>${style}`);
    }

    public destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        this.container.innerHTML = '';
    }
}
