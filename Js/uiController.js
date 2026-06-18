import { calcularFrecuencia } from './audioEngine.js';

const ESTRUCTURA_OCTAVA = [
    { nota: 'C', tipo: 'white' }, { nota: 'C#', tipo: 'black' },
    { nota: 'D', tipo: 'white' }, { nota: 'D#', tipo: 'black' },
    { nota: 'E', tipo: 'white' }, { nota: 'F', tipo: 'white' },
    { nota: 'F#', tipo: 'black' }, { nota: 'G', tipo: 'white' },
    { nota: 'G#', tipo: 'black' }, { nota: 'A', tipo: 'white' },
    { nota: 'A#', tipo: 'black' }, { nota: 'B', tipo: 'white' }
];

export function generarTecladoDOM(onPlay, onStop) {
    const slider = document.getElementById('octaveSlider');
    if (!slider) return {};
    const cantidadOctavas = parseInt(slider.value);
    document.getElementById('octaveDisplay').textContent = `${cantidadOctavas} ${cantidadOctavas === 1 ? 'Octava' : 'Octavas'}`;
    const contenedor = document.getElementById('pianoContainer');
    contenedor.innerHTML = '';
    
    const mapaTecladoFrecuencias = {};
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
            
            li.addEventListener('mousedown', () => onPlay(idNota));
            li.addEventListener('mouseup', () => onStop(idNota));
            li.addEventListener('mouseleave', () => onStop(idNota));
            
            contenedor.appendChild(li);
        });
    }
    return mapaTecladoFrecuencias;
}

export function dibujarGraficoADSR() {
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