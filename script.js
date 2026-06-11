let audioCtx = null;
const notasActivas = {};
let mapaTecladoFrecuencias = {};

const ESTRUCTURA_OCTAVA = [
    { nota: 'C', tipo: 'white' }, { nota: 'C#', tipo: 'black' },
    { nota: 'D', tipo: 'white' }, { nota: 'D#', tipo: 'black' },
    { nota: 'E', tipo: 'white' }, { nota: 'F', tipo: 'white' },
    { nota: 'F#', tipo: 'black' }, { nota: 'G', tipo: 'white' },
    { nota: 'G#', tipo: 'black' }, { nota: 'A', tipo: 'white' },
    { nota: 'A#', tipo: 'black' }, { nota: 'B', tipo: 'white' }
];

const matrizFiltros = { A: 'lowpass', B: 'lowpass', C: 'lowpass' };
// Registro para saber si el filtro está encendido (true) o en bypass (false)
const matrizFiltrosActivos = { A: true, B: true, C: true };

function asegurarAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function crearBufferRuido(tipo) {
    const tamañoBuffer = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, tamañoBuffer, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    if (tipo === 'white') {
        for (let i = 0; i < tamañoBuffer; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } else if (tipo === 'pink') {
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < tamañoBuffer; i++) {
            let white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            b6 = white * 0.115926;
            data[i] = pink * 0.11;
        }
    }
    return buffer;
}

function calcularFrecuencia(nombreNota, numeroOctava) {
    const nombres = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return 440 * Math.pow(2, (((numeroOctava * 12) + nombres.indexOf(nombreNota)) - 57) / 12);
}

function generarTeclado() {
    const slider = document.getElementById('octaveSlider');
    if (!slider) return;
    const cantidadOctavas = parseInt(slider.value);
    document.getElementById('octaveDisplay').textContent = `${cantidadOctavas} ${cantidadOctavas === 1 ? 'Octava' : 'Octavas'}`;
    const contenedor = document.getElementById('pianoContainer');
    contenedor.innerHTML = '';
    mapaTecladoFrecuencias = {};
    
    let octavaInicial = 3;
    for (let o = 0; o < cantidadOctavas; o++) {
        const octavaActual = octavaInicial + o;
        ESTRUCTURA_OCTAVA.forEach(item => {
            const idNota = `${item.nota}${octavaActual}`;
            mapaTecladoFrecuencias[idNota] = calcularFrecuencia(item.nota, octavaActual);
            
            const li = document.createElement('li');
            li.className = `key ${item.tipo}`;
            li.setAttribute('data-note', idNota);
            
            const span = document.createElement('span');
            span.textContent = idNota;
            li.appendChild(span);
            
            li.addEventListener('mousedown', () => playNota(idNota));
            li.addEventListener('mouseup', () => stopNota(idNota));
            li.addEventListener('mouseleave', () => stopNota(idNota));
            
            contenedor.appendChild(li);
        });
    }
}

function playNota(idNota) {
    asegurarAudioContext();
    if (notasActivas[idNota]) return;

    const frecuencia = mapaTecladoFrecuencias[idNota];
    if (!frecuencia) return;

    const actA = document.getElementById('btnToggleA').checked;
    const actB = document.getElementById('btnToggleB').checked;
    const actC = document.getElementById('btnToggleC').checked;
    const actNoise = document.getElementById('btnToggleNoise').checked;

    if (!actA && !actB && !actC && !actNoise) return;

    const estructura = { oscs: [], noiseNode: null, gainNode: audioCtx.createGain() };
    const attack = parseFloat(document.getElementById('adsrAttack').value);
    const decay = parseFloat(document.getElementById('adsrDecay').value);
    const sustain = parseFloat(document.getElementById('adsrSustain').value);

    // Función de ruteo modificada para respetar el encendido/apagado del filtro
    const añadirOscilador = (oscId, tipo, detuneVal, filterType) => {
        const osc = audioCtx.createOscillator();
        osc.type = tipo;
        osc.frequency.setValueAtTime(frecuencia, audioCtx.currentTime);
        osc.detune.setValueAtTime(detuneVal, audioCtx.currentTime);
        
        // Verificamos si el interruptor del filtro está en ON
        if (matrizFiltrosActivos[oscId]) {
            const filter = audioCtx.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.setValueAtTime(filterType === 'lowpass' ? 1200 : filterType === 'highpass' ? 400 : 800, audioCtx.currentTime);
            
            osc.connect(filter);
            filter.connect(estructura.gainNode);
        } else {
            // BYPASS: Se salta el filtro y conecta directo al amplificador de volumen
            osc.connect(estructura.gainNode);
        }

        osc.start();
        estructura.oscs.push(osc);
    };

    if (actA) añadirOscilador('A', document.getElementById('waveTypeA').value, parseFloat(document.getElementById('detuneSliderA').value), matrizFiltros.A);
    if (actB) añadirOscilador('B', document.getElementById('waveTypeB').value, parseFloat(document.getElementById('detuneSliderB').value), matrizFiltros.B);
    if (actC) añadirOscilador('C', document.getElementById('waveTypeC').value, parseFloat(document.getElementById('detuneSliderC').value), matrizFiltros.C);

    if (actNoise) {
        const noiseSource = audioCtx.createBufferSource();
        const noiseGain = audioCtx.createGain();
        noiseSource.buffer = crearBufferRuido(document.getElementById('noiseType').value);
        noiseSource.loop = true;
        noiseGain.gain.setValueAtTime(parseFloat(document.getElementById('noiseVolume').value) * 0.15, audioCtx.currentTime);
        noiseSource.connect(noiseGain);
        noiseGain.connect(estructura.gainNode);
        noiseSource.start();
        estructura.noiseNode = noiseSource;
    }

    const t = audioCtx.currentTime;
    estructura.gainNode.gain.setValueAtTime(0, t);
    estructura.gainNode.gain.linearRampToValueAtTime(0.25, t + attack);
    estructura.gainNode.gain.linearRampToValueAtTime(0.25 * sustain, t + attack + decay);
    
    estructura.gainNode.connect(audioCtx.destination);
    notasActivas[idNota] = estructura;

    const teclaDOM = document.querySelector(`[data-note="${idNota}"]`);
    if (teclaDOM) teclaDOM.classList.add('active');
}

function stopNota(idNota) {
    const estructura = notasActivas[idNota];
    if (estructura) {
        const release = parseFloat(document.getElementById('adsrRelease').value);
        const t = audioCtx.currentTime;

        estructura.gainNode.gain.cancelScheduledValues(t);
        estructura.gainNode.gain.setValueAtTime(estructura.gainNode.gain.value, t);
        estructura.gainNode.gain.exponentialRampToValueAtTime(0.0001, t + release);
        
        setTimeout(() => {
            estructura.oscs.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch(e){} });
            if (estructura.noiseNode) { try { estructura.noiseNode.stop(); estructura.noiseNode.disconnect(); } catch(e){} }
            estructura.gainNode.disconnect();
        }, (release * 1000) + 50);

        delete notasActivas[idNota];
    }
    const teclaDOM = document.querySelector(`[data-note="${idNota}"]`);
    if (teclaDOM) teclaDOM.classList.remove('active');
}

function dibujarGraficoADSR() {
    const canvas = document.getElementById('adsrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const att = parseFloat(document.getElementById('adsrAttack').value);
    const dec = parseFloat(document.getElementById('adsrDecay').value);
    const sus = parseFloat(document.getElementById('adsrSustain').value);
    const rel = parseFloat(document.getElementById('adsrRelease').value);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(60, 30, 112, 0.2)';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=20) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=20) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    const w = canvas.width - 40;
    const h = canvas.height - 20;

    const x0 = 20, y0 = canvas.height - 10;
    const x1 = x0 + (att / 2) * (w * 0.3);
    const y1 = y0 - h;
    const x2 = x1 + (dec / 2) * (w * 0.3);
    const y2 = y0 - (sus * h);
    const x3 = x2 + (w * 0.2);
    const y3 = y2;
    const x4 = x3 + (rel / 3) * (w * 0.2);
    const y4 = y0;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    
    ctx.strokeStyle = '#9d4edd';
    ctx.lineWidth = 3;
    ctx.stroke();
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

    // Evento click para alternar entre encendido y apagado
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

// Inicialización controlada
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('octaveSlider').addEventListener('input', generarTeclado);
    ['adsrAttack', 'adsrDecay', 'adsrSustain', 'adsrRelease'].forEach(id => document.getElementById(id).addEventListener('input', actualizarInterfaz));
    ['detuneSliderA', 'detuneSliderB', 'detuneSliderC', 'noiseVolume', 'btnToggleA', 'btnToggleB', 'btnToggleC', 'btnToggleNoise', 'noiseType'].forEach(id => document.getElementById(id).addEventListener('input', actualizarInterfaz));

    vincularFiltros('A', 'fltA-lp', 'fltA-hp', 'fltA-bp', 'pwrFiltroA');
    vincularFiltros('B', 'fltB-lp', 'fltB-hp', 'fltB-bp', 'pwrFiltroB');
    vincularFiltros('C', 'fltC-lp', 'fltC-hp', 'fltC-bp', 'pwrFiltroC');

    generarTeclado();
    actualizarInterfaz();
});