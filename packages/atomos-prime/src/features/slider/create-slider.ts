export interface RangeSliderProps {
    min: number;
    max: number;
    value: number;
    step?: number;
    label?: string;
    showValue?: boolean;
    onChange?: (value: number) => void;
}

export interface RangeSliderResult {
    element: HTMLElement;
    updateValue: (value: number) => void;
    cleanup: { destroy: () => void };
}

export function createRangeSlider(props: RangeSliderProps): RangeSliderResult {
    const root = document.createElement('div');
    root.className = 'w-full flex flex-col gap-1 text-sm text-slate-300';
    
    if (props.label) {
        const header = document.createElement('div');
        header.className = 'flex justify-between items-center text-xs text-slate-400 mb-1 font-semibold tracking-wider uppercase';
        
        const labelEl = document.createElement('span');
        labelEl.textContent = props.label;
        header.appendChild(labelEl);
        
        if (props.showValue) {
            const valEl = document.createElement('span');
            valEl.className = 'text-indigo-400 tabular-nums';
            valEl.textContent = props.value.toFixed(1);
            header.appendChild(valEl);
            
            root.addEventListener('slider:update', (e: any) => {
                valEl.textContent = e.detail.value.toFixed(1);
            });
        }
        
        root.appendChild(header);
    }
    
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'relative flex items-center h-6 py-1 px-0';
    
    const track = document.createElement('div');
    track.className = 'w-full h-1 bg-slate-700/50 rounded-full overflow-hidden';
    
    const fill = document.createElement('div');
    fill.className = 'h-full bg-indigo-500 rounded-full transition-all duration-75';
    
    const thumb = document.createElement('div');
    thumb.className = 'absolute w-3 h-3 h-full bg-white border border-slate-300 rounded-full shadow cursor-grab transform -translate-x-1/2 -translate-y-1/2 top-1/2 transition-transform hover:scale-110 active:scale-95 active:cursor-grabbing z-10';
    
    track.appendChild(fill);
    sliderContainer.appendChild(track);
    sliderContainer.appendChild(thumb);
    root.appendChild(sliderContainer);
    
    let isDragging = false;
    let currentValue = props.value;
    
    const updateRender = (val: number) => {
        const percent = ((val - props.min) / (props.max - props.min)) * 100;
        fill.style.width = `${Math.max(0, Math.min(100, percent))}%`;
        thumb.style.left = `${Math.max(0, Math.min(100, percent))}%`;
        root.dispatchEvent(new CustomEvent('slider:update', { detail: { value: val } }));
    };
    
    const onMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging) return;
        const rect = sliderContainer.getBoundingClientRect();
        const isTouch = 'touches' in e;
        const clientX = isTouch ? (e as any).touches[0].clientX : (e as MouseEvent).clientX;
        let percent = (clientX - rect.left) / rect.width;
        percent = Math.max(0, Math.min(1, percent));
        
        let rawVal = props.min + percent * (props.max - props.min);
        let snappedVal = rawVal;
        
        if (props.step) {
            snappedVal = Math.round(rawVal / props.step) * props.step;
        }
        
        if (snappedVal !== currentValue) {
            currentValue = Math.min(Math.max(snappedVal, props.min), props.max);
            updateRender(currentValue);
            if (props.onChange) props.onChange(currentValue);
        }
    };
    
    const onEnd = () => {
        isDragging = false;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
    };
    
    const startDrag = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        onMove(e); // Trigger immediately to jump to click pos
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
        document.addEventListener('touchmove', onMove, { passive: false });
        document.addEventListener('touchend', onEnd);
    };
    
    sliderContainer.addEventListener('mousedown', startDrag);
    sliderContainer.addEventListener('touchstart', startDrag, { passive: true });
    
    updateRender(currentValue);
    
    return {
        element: root,
        updateValue: (val: number) => {
            currentValue = val;
            updateRender(val);
        },
        cleanup: {
            destroy: () => root.remove()
        }
    };
}