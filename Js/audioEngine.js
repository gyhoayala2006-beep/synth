export let audioCtx = null;
export const notasActivas = {};
export const matrizFiltros = { A: 'lowpass', B: 'lowpass', C: 'lowpass' };
export const matrizFiltrosActivos = { A: true, B: true, C: true };

export function asegurarAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

export function crearBufferRuido(tipo) {
    const tamañoBuffer = 2 * audioCtx.sampleRate;
    const buffer = audioCtx.createBuffer(1, tamañoBuffer, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    if (tipo === 'white') {
        for (let i = 0; i < tamañoBuffer; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    } else if (tipo === 'pink') {
        let b0 = 0.0, b1 = 0.0, b2 = 0.0, b3 = 0.0, b4 = 0.0, b5 = 0.0, b6 = 0.0;
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

export function calcularFrecuencia(nombreNota, numeroOctava) {
    const nombres = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return 440 * Math.pow(2, (((numeroOctava * 12) + nombres.indexOf(nombreNota)) - 57) / 12);
}

export function reproducirNota(idNota, mapaTecladoFrecuencias, controles) {
    asegurarAudioContext();
    if (notasActivas[idNota]) return;

    const frecuencia = mapaTecladoFrecuencias[idNota];
    if (!frecuencia) return;

    if (!controles.actA && !controles.actB && !controles.actC && !controles.actNoise) return;

    const estructura = { oscs: [], noiseNode: null, gainNode: audioCtx.createGain() };

    const añadirOscilador = (oscId, tipo, detuneVal, filterType) => {
        const osc = audioCtx.createOscillator();
        osc.type = tipo;
        osc.frequency.setValueAtTime(frecuencia, audioCtx.currentTime);
        osc.detune.setValueAtTime(detuneVal, audioCtx.currentTime);
        
        if (matrizFiltrosActivos[oscId]) {
            const filter = audioCtx.createBiquadFilter();
            filter.type = filterType;
            filter.frequency.setValueAtTime(filterType === 'lowpass' ? 1200 : filterType === 'highpass' ? 400 : 800, audioCtx.currentTime);
            
            osc.connect(filter);
            filter.connect(estructura.gainNode);
        } else {
            osc.connect(estructura.gainNode);
        }

        osc.start();
        estructura.oscs.push(osc);
    };

    if (controles.actA) añadirOscilador('A', controles.waveTypeA, controles.detuneA, matrizFiltros.A);
    if (controles.actB) añadirOscilador('B', controles.waveTypeB, controles.detuneB, matrizFiltros.B);
    if (controles.actC) añadirOscilador('C', controles.waveTypeC, controles.detuneC, matrizFiltros.C);

    if (controles.actNoise) {
        const noiseSource = audioCtx.createBufferSource();
        const noiseGain = audioCtx.createGain();
        noiseSource.buffer = crearBufferRuido(controles.noiseType);
        noiseSource.loop = true;
        noiseGain.gain.setValueAtTime(controles.noiseVolume * 0.15, audioCtx.currentTime);
        noiseSource.connect(noiseGain);
        noiseGain.connect(estructura.gainNode);
        noiseSource.start();
        estructura.noiseNode = noiseSource;
    }

    const t = audioCtx.currentTime;
    estructura.gainNode.gain.setValueAtTime(0, t);
    estructura.gainNode.gain.linearRampToValueAtTime(0.25, t + controles.attack);
    estructura.gainNode.gain.linearRampToValueAtTime(0.25 * controles.sustain, t + controles.attack + controles.decay);
    
    estructura.gainNode.connect(audioCtx.destination);
    notasActivas[idNota] = estructura;

    const teclaDOM = document.querySelector(`[data-note="${idNota}"]`);
    if (teclaDOM) teclaDOM.classList.add('active');
}

export function detenerNota(idNota, release) {
    const estructura = notasActivas[idNota];
    if (estructura) {
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