import { 
    reproducirNota, 
    detenerNota, 
    matrizFiltros, 
    matrizFiltrosActivos 
} from './audioEngine.js';

import { 
    generarTecladoDOM, 
    dibujarGraficoADSR 
} from './uiController.js';

let mapaTecladoFrecuencias = {};

// Captura el estado actual de los sliders, selectores y switches del DOM
function obtenerControlesUI() {
    return {
        actA: document.getElementById('btnToggleA').checked,
        actB: document.getElementById('btnToggleB').checked,
        actC: document.getElementById('btnToggleC').checked,
        actNoise: document.getElementById('btnToggleNoise').checked,
        waveTypeA: document.getElementById('waveTypeA').value,
        waveTypeB: document.getElementById('waveTypeB').value,
        waveTypeC: document.getElementById('waveTypeC').value,
        detuneA: parseFloat(document.getElementById('detuneSliderA').value),
        detuneB: parseFloat(document.getElementById('detuneSliderB').value),
        detuneC: parseFloat(document.getElementById('detuneSliderC').value),
        noiseType: document.getElementById('noiseType').value,
        noiseVolume: parseFloat(document.getElementById('noiseVolume').value),
        attack: parseFloat(document.getElementById('adsrAttack').value),
        decay: parseFloat(document.getElementById('adsrDecay').value),
        sustain: parseFloat(document.getElementById('adsrSustain').value)
    };
}

function dispararPlayNota(idNota) {
    const controles = obtenerControlesUI();
    reproducirNota(idNota, mapaTecladoFrecuencias, controles);
}

function dispararStopNota(idNota) {
    const release = parseFloat(document.getElementById('adsrRelease').value);
    detenerNota(idNota, release);
}

function actualizarInterfaz() {
    ['A', 'B', 'C'].forEach(id => {
        const slider = document.getElementById(`detuneSlider${id}`);
        if(slider) {
            const val = slider.value;
            document.getElementById(`detuneDisplay${id}`).textContent = `${val > 0 ? '+' : ''}${val}c`;
            document.getElementById(`section-${id}`).classList.toggle('active', document.getElementById(`btnToggle${id}`).checked);
        }
    });
    
    const noiseVolInput = document.getElementById('noiseVolume');
    if(noiseVolInput) {
        const noiseVol = Math.round(parseFloat(noiseVolInput.value) * 100);
        document.getElementById('noiseVolDisplay').textContent = `${noiseVol}%`;
        document.getElementById('section-Noise').classList.toggle('active', document.getElementById('btnToggleNoise').checked);
    }

    document.getElementById('displayAttack').textContent = `${parseFloat(document.getElementById('adsrAttack').value).toFixed(2)}s`;
    document.getElementById('displayDecay').textContent = `${parseFloat(document.getElementById('adsrDecay').value).toFixed(2)}s`;
    document.getElementById('displaySustain').textContent = `${Math.round(parseFloat(document.getElementById('adsrSustain').value) * 100)}%`;
    document.getElementById('displayRelease').textContent = `${parseFloat(document.getElementById('adsrRelease').value).toFixed(2)}s`;

    dibujarGraficoADSR();
}

function actualizarTeclado() {
    mapaTecladoFrecuencias = generarTecladoDOM(dispararPlayNota, dispararStopNota);
}

function vincularFiltros(oscId, lpId, hpId, bpId, pwrId) {
    const cambiarFiltro = (tipo, btnId) => {
        matrizFiltros[oscId] = tipo;
        [lpId, hpId, bpId].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.remove('active');
        });
        const activoBtn = document.getElementById(btnId);
        if(activoBtn) activoBtn.classList.add('active');
    };
    
    const bLp = document.getElementById(lpId);
    const bHp = document.getElementById(hpId);
    const bBp = document.getElementById(bpId);
    const bPwr = document.getElementById(pwrId);

    if(bLp) bLp.addEventListener('click', () => cambiarFiltro('lowpass', lpId));
    if(bHp) bHp.addEventListener('click', () => cambiarFiltro('highpass', hpId));
    if(bBp) bBp.addEventListener('click', () => cambiarFiltro('bandpass', bpId));

    if(bPwr) {
        bPwr.addEventListener('click', () => {
            matrizFiltrosActivos[oscId] = !matrizFiltrosActivos[oscId];
            if(matrizFiltrosActivos[oscId]) {
                bPwr.classList.add('active');
                bPwr.textContent = "ON";
            } else {
                bPwr.classList.remove('active');
                bPwr.textContent = "BYPASS";
            }
        });
    }
}

// Inicialización de la aplicación al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('octaveSlider').addEventListener('input', actualizarTeclado);
    
    ['adsrAttack', 'adsrDecay', 'adsrSustain', 'adsrRelease'].forEach(id => 
        document.getElementById(id).addEventListener('input', actualizarInterfaz)
    );
    
    ['detuneSliderA', 'detuneSliderB', 'detuneSliderC', 'noiseVolume', 'btnToggleA', 'btnToggleB', 'btnToggleC', 'btnToggleNoise', 'noiseType'].forEach(id => 
        document.getElementById(id).addEventListener('input', actualizarInterfaz)
    );

    vincularFiltros('A', 'fltA-lp', 'fltA-hp', 'fltA-bp', 'pwrFiltroA');
    vincularFiltros('B', 'fltB-lp', 'fltB-hp', 'fltB-bp', 'pwrFiltroB');
    vincularFiltros('C', 'fltC-lp', 'fltC-hp', 'fltC-bp', 'pwrFiltroC');

    actualizarTeclado();
    actualizarInterfaz();
});