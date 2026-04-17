document.addEventListener('DOMContentLoaded', () => {

    // --- LOGIKA UNIVERSAL: THEME SWITCHER ---
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        const applyTheme = (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            themeToggle.checked = theme === 'dark';
        };
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
        themeToggle.addEventListener('change', (e) => {
            const newTheme = e.target.checked ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            applyTheme(newTheme);
        });
    }

    // --- LOGIKA KHUSUS HALAMAN CHAT ---
    if (document.getElementById('app-wrapper')) {
        const SESSION_LIMIT = 10000;
        const API_ENDPOINT = 'https://api.siputzx.my.id/api/ai/glm47flash';
        const PHOTO_API_ENDPOINT = 'https://api.siputzx.my.id/api/m/ephoto360';
        const GPT_IMAGE_API = 'https://ikyyzyyrestapi.my.id/ai/gptimage';
        const NEWS_API = 'https://ikyyzyyrestapi.my.id/berita/google-news';
        const SSWEB_API = 'https://api.siputzx.my.id/api/tools/ssweb';
        const GEMPA_API = 'https://api.siputzx.my.id/api/info/bmkg'; 
        const WEATHER_API = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
        const BRAT_API = 'https://ikyyzyyrestapi.my.id/maker/bratbahlil'; // API BRAT BARU
        const REGION_DATA_URL = '../js/CodeDaerah.json'; 

        const chatContainer = document.getElementById('chat-container');
        const chatMessages = document.getElementById('chat-messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const newChatBtn = document.getElementById('new-chat-btn');
        const sessionList = document.getElementById('session-list');
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const appWrapper = document.getElementById('app-wrapper');

        let sessionsData = {};
        let isAwaitingResponse = false;
        let regionContext = "";

        const loadRegionData = async () => {
            try {
                const res = await fetch(REGION_DATA_URL);
                const data = await res.json();
                regionContext = data.daftar_wilayah.map(w => `${w.nama}: ${w.kode}`).join(', ');
                
                if (sessionsData.activeSessionId && sessionsData.sessions[sessionsData.activeSessionId]) {
                    sessionsData.sessions[sessionsData.activeSessionId][0] = getSystemPrompt();
                }
            } catch (e) {
                console.error("Gagal memuat CodeDaerah.json", e);
            }
        };

        const getSystemPrompt = () => ({ 
    role: 'system', 
    content: `Anda adalah Synapse Veda, asisten AI canggih dikembangkan oleh HidzzY (Wahid).

[Tujuan Utama]
Berikan informasi akurat dan cepat. Selalu gunakan data terbaru.

[Fitur Khusus: Execution]
Jika user meminta fitur ini, kamu WAJIB menjawab HANYA dengan format /exec diikuti parameternya.
1. Grafiti Nama: /exec ephoto360: [NAMA]
2. Gambar AI: /exec gptimage: [PROMPT]
3. Stalk: /exec stalk:[PLATFORM]: [USERNAME]
4. Berita: /exec news:google
5. Screenshot: /exec ssweb: [URL]
6. Gempa: /exec gempa:bmkg
7. Cuaca: /exec weather: [KODE_ADM4]
8. Brat: /exec brat: [TEKS]

[Referensi Kode Wilayah (Nama: Kode)]
${regionContext || "Data wilayah sedang dimuat..."}

[Prosedur Cuaca]
1. Jika user tanya cuaca di lokasi yang ada di daftar referensi, cari kode ADM4 yang sesuai.
2. WAJIB balas HANYA dengan format: /exec weather: [KODE].
3. Gunakan titik pada kode wilayah sesuai referensi.
4. Jika lokasi TIDAK ada di daftar, minta maaf dengan santai.

[Kepribadian]
Gaya Bahasa: Santai, gunakan "gw", "lu", "bre". Jangan terlalu kaku.`
});

        const saveSessions = () => localStorage.setItem('synapseVedaSessions', JSON.stringify(sessionsData));

        const loadSessions = () => {
            const saved = localStorage.getItem('synapseVedaSessions');
            if (saved) {
                sessionsData = JSON.parse(saved);
                if (!sessionsData.sessions || !sessionsData.activeSessionId || Object.keys(sessionsData.sessions).length === 0) {
                    createNewSession(false);
                }
            } else {
                sessionsData = { activeSessionId: null, sessions: {} };
                createNewSession(false);
            }
            renderAll();
        };

        const createNewSession = (shouldRender = true) => {
            if (Object.keys(sessionsData.sessions).length >= SESSION_LIMIT) {
                alert(`Batas maksimal ${SESSION_LIMIT} sesi tercapai.`);
                return;
            }
            const newId = `session-${Date.now()}`;
            const welcomeMessage = { role: 'assistant', content: 'Halo Bre! Saya Synapse Veda. Ada yang bisa saya bantu?' };
            sessionsData.sessions[newId] = [getSystemPrompt(), welcomeMessage];
            sessionsData.activeSessionId = newId;
            saveSessions();
            if (shouldRender) {
                renderAll();
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('open');
                    sidebarOverlay.classList.remove('open');
                }
            }
        };
        
        const switchSession = (sessionId) => {
            if (!sessionsData.sessions[sessionId] || isAwaitingResponse) return;
            sessionsData.activeSessionId = sessionId;
            saveSessions();
            renderAll();
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.remove('open');
            }
        };

        const deleteSession = (sessionId, e) => {
            e.stopPropagation();
            delete sessionsData.sessions[sessionId];
            if (sessionsData.activeSessionId === sessionId) {
                const remainingIds = Object.keys(sessionsData.sessions);
                sessionsData.activeSessionId = remainingIds.length > 0 ? remainingIds[0] : null;
                if (!sessionsData.activeSessionId) createNewSession();
            }
            saveSessions();
            renderAll();
        };

        const enhanceCodeBlocks = (container) => {
            container.querySelectorAll('pre').forEach(pre => {
                const code = pre.querySelector('code');
                if (!code || pre.parentElement.classList.contains('code-wrapper')) return;
                const wrapper = document.createElement('div');
                wrapper.className = 'code-wrapper';
                const header = document.createElement('div');
                header.className = 'code-header';
                header.innerHTML = `<span>Code</span><button class="code-copy-btn"><i class="fa-regular fa-copy"></i> Salin</button>`;
                header.querySelector('button').onclick = () => {
                    navigator.clipboard.writeText(code.innerText).then(() => {
                        header.querySelector('button').innerHTML = '<i class="fa-solid fa-check"></i> Disalin!';
                        setTimeout(() => { header.querySelector('button').innerHTML = '<i class="fa-regular fa-copy"></i> Salin'; }, 2000);
                    });
                };
                pre.parentNode.replaceChild(wrapper, pre);
                wrapper.appendChild(header);
                wrapper.appendChild(pre);
                if (typeof hljs !== 'undefined') hljs.highlightElement(code);
            });
        };

        const appendMessage = (message) => {
    if (message.role === 'system') return;
    
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message ${message.role}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    if (message.role === 'user') {
        contentDiv.textContent = message.content;
    } else {
        if (message.content.trim().startsWith('<div')) {
            contentDiv.innerHTML = message.content;
        } else {
            contentDiv.innerHTML = typeof marked !== 'undefined' ? marked.parse(message.content) : message.content;
        }
        enhanceCodeBlocks(contentDiv);
    }
    
    messageWrapper.appendChild(contentDiv);
    chatMessages.appendChild(messageWrapper);
    scrollToBottom();
    return contentDiv;
};

        const renderSessionList = () => {
            sessionList.innerHTML = '';
            Object.keys(sessionsData.sessions).sort((a,b) => b.split('-')[1] - a.split('-')[1]).forEach(id => {
                const firstUserMessage = sessionsData.sessions[id].find(msg => msg.role === 'user');
                const title = firstUserMessage ? firstUserMessage.content.substring(0, 25) + '...' : 'Chat Baru';
                const item = document.createElement('div');
                item.className = `session-item ${id === sessionsData.activeSessionId ? 'active' : ''}`;
                item.innerHTML = `<span class="session-item-title">${title}</span><button class="session-item-delete-btn"><i class="fa-solid fa-trash-can"></i></button>`;
                item.onclick = () => switchSession(id);
                item.querySelector('.session-item-delete-btn').onclick = (e) => deleteSession(id, e);
                sessionList.appendChild(item);
            });
            newChatBtn.disabled = Object.keys(sessionsData.sessions).length >= SESSION_LIMIT;
        };
        
        const renderChatMessages = () => {
            chatMessages.innerHTML = '';
            (sessionsData.sessions[sessionsData.activeSessionId] || []).forEach(msg => appendMessage(msg));
        };
        
        const renderAll = () => { renderSessionList(); renderChatMessages(); };
        const scrollToBottom = () => chatContainer.scrollTop = chatContainer.scrollHeight;

        const typewriterEffect = (element, fullText) => {
            let i = 0;
            const typing = () => {
                if (i < fullText.length) {
                    element.innerHTML = marked.parse(fullText.substring(0, i + 1));
                    scrollToBottom();
                    i++;
                    requestAnimationFrame(typing);
                } else {
                    element.innerHTML = marked.parse(fullText);
                    enhanceCodeBlocks(element);
                    isAwaitingResponse = false;
                }
            };
            requestAnimationFrame(typing);
        };
        
        const handleSendMessage = async () => {
            const userText = messageInput.value.trim();
            if (!userText || isAwaitingResponse) return;
            isAwaitingResponse = true;

            const activeSession = sessionsData.sessions[sessionsData.activeSessionId];
            activeSession.push({ role: 'user', content: userText });
            appendMessage({ role: 'user', content: userText });
            
            saveSessions();
            messageInput.value = '';
            messageInput.style.height = 'auto';

            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'message assistant typing-indicator';
            typingIndicator.innerHTML = '<span></span><span></span><span></span>';
            chatMessages.appendChild(typingIndicator);
            scrollToBottom();
            
            try {
                const sysContent = activeSession[0].content;
                const finalUrl = `${API_ENDPOINT}?prompt=${encodeURIComponent(userText)}&system=${encodeURIComponent(sysContent)}&temperature=0.7`;

                const response = await fetch(finalUrl);
                if(typingIndicator) typingIndicator.remove();
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                let aiFullText = data.data?.response || data.data || "Gagal memuat respon.";
                
                // DETEKSI LOGIKA EXECUTION
                if (aiFullText.toLowerCase().includes("/exec") || aiFullText.toLowerCase().includes("weather:")) {
                    let finalOutput = "";
                    let cleanText = aiFullText.split(/\/exec/i)[0].replace(/\[EXEC\]/gi, '').split("weather:")[0].trim();

                    if (aiFullText.includes("ephoto360:")) {
                        const name = aiFullText.split("ephoto360:")[1].trim().split('\n')[0];
                        const effectUrl = "https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html";
                        const img = `${PHOTO_API_ENDPOINT}?url=${encodeURIComponent(effectUrl)}&text1=${encodeURIComponent(name)}`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${img}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    } 
                    else if (aiFullText.includes("gptimage:")) {
                        const prompt = aiFullText.split("gptimage:")[1].trim().split('\n')[0];
                        const img = `${GPT_IMAGE_API}?text=${encodeURIComponent(prompt)}`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${img}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);" onerror="this.src='https://via.placeholder.com/400?text=Gagal+Membuat+Gambar'">`;
                    }
                    else if (aiFullText.includes("brat:")) { // LOGIKA BRAT BARU
                        const teksBrat = aiFullText.split("brat:")[1].trim().split('\n')[0];
                        const imgBrat = `${BRAT_API}?text=${encodeURIComponent(teksBrat)}`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${imgBrat}" style="max-width:300px; width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    }
                    else if (aiFullText.includes("news:google")) {
                        const nRes = await fetch(NEWS_API);
                        const nData = await nRes.json();
                        if(nData.status) {
                            let newsList = nData.result.slice(0, 5).map(n => `<li><a href="${n.link}" style="color:var(--accent-color); font-weight:bold;">${n.title}</a><br><small>Sumber: ${n.source}</small></li>`).join('');
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<ul style="padding-left:20px; line-height:1.6;">${newsList}</ul>`;
                        }
                    }
                    else if (aiFullText.includes("ssweb:")) {
                        const urlTarget = aiFullText.split("ssweb:")[1].trim().split('\n')[0];
                        const ssImg = `${SSWEB_API}?url=${encodeURIComponent(urlTarget)}&device=desktop&theme=dark&fullPage=false`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${ssImg}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    }
                    else if (aiFullText.includes("stalk:")) {
                        const stalkParts = aiFullText.split("stalk:")[1].trim().split(":");
                        const platform = stalkParts[0].trim().toLowerCase();
                        const username = stalkParts[1].trim().replace(/[?.!\n]/g, '').split(' ')[0];
                        let stalkUrl = platform === 'tiktok' ? `https://api.siputzx.my.id/api/stalk/tiktok?username=${username}` : 
                                       platform === 'instagram' ? `https://ikyyzyyrestapi.my.id/stalk/igv2?username=${username}` : 
                                       `https://api.siputzx.my.id/api/stalk/github?user=${username}`;

                        const sRes = await fetch(stalkUrl);
                        const sData = await sRes.json();
                        if(sData.status) {
                            let profile = platform === 'instagram' ? sData.result : (sData.data.user || sData.data);
                            let stats = platform === 'instagram' ? sData.result.stats : (sData.data.stats || sData.data);
                            let pic = platform === 'instagram' ? profile.profile.images : (profile.avatarMedium || profile.profile_pic);
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}
                            <div style="background:var(--bg-secondary); padding:15px; border-radius:10px; border:1px solid var(--accent-color);">
                                <img src="${pic}" style="width:80px; height:80px; border-radius:50%; border:2px solid var(--accent-color);">
                                <div style="font-weight:bold;">${profile.nickname || profile.full_name || username}</div>
                                <div style="font-size:0.85em;">Followers: ${stats.followers || stats.followerCount}</div>
                            </div>`;
                        }
                    }
                    else if (aiFullText.includes("gempa:bmkg")) {
                        const gRes = await fetch(GEMPA_API);
                        const gData = await gRes.json();
                        if(gData.status && gData.data.auto) {
                            const g = gData.data.auto.Infogempa.gempa;
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}
                            <div style="background:var(--bg-secondary); padding:15px; border-radius:10px; border:1px solid var(--accent-color); text-align:left;">
                                <div style="font-weight:bold; color:#ff4d4d; margin-bottom:5px;">⚠️ INFO GEMPA TERKINI</div>
                                <div style="font-size:0.9em;">
                                    📅 <b>Tanggal:</b> ${g.Tanggal}<br>
                                    ⌚ <b>Jam:</b> ${g.Jam}<br>
                                    📍 <b>Wilayah:</b> ${g.Wilayah}<br>
                                    📏 <b>Magnitudo:</b> ${g.Magnitude} SR<br>
                                    🌊 <b>Kedalaman:</b> ${g.Kedalaman}<br>
                                    📢 <b>Potensi:</b> ${g.Potensi}
                                </div>
                                <img src="${g.downloadShakemap}" style="width:100%; border-radius:8px; margin-top:10px;">
                            </div>`;
                        }
                    }
                    else if (aiFullText.includes("weather:")) {
                        let rawCode = aiFullText.split("weather:")[1].trim();
                        const adm4 = rawCode.replace(/[?!\n]/g, '').split(' ')[0];
                        try {
                            const wRes = await fetch(`${WEATHER_API}?adm4=${adm4}`);
                            if (!wRes.ok) throw new Error(`BMKG Error: ${wRes.status}`);
                            const wData = await wRes.json();
                            if (wData.data && wData.data.length > 0) {
                                const location = wData.data[0].lokasi;
                                const cur = wData.data[0].cuaca[0][0];
                                const weatherIcon = cur.image; 
                                finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}
                                <div style="background:linear-gradient(135deg, #1e1e2f, #111); padding:20px; border-radius:15px; border:1px solid var(--accent-color); color:white;">
                                    <div style="font-size:1.1em; font-weight:bold; color:var(--accent-color);"><i class="fa-solid fa-location-dot"></i> ${location.desa}</div>
                                    <div style="display:flex; align-items:center; margin:15px 0;">
                                        <img src="${weatherIcon}" style="width:70px; height:70px;">
                                        <div style="margin-left:15px;">
                                            <div style="font-size:3em; font-weight:bold; line-height:1;">${cur.t}°C</div>
                                            <div style="font-size:1em; font-weight:500; color:var(--accent-color);">${cur.weather_desc}</div>
                                        </div>
                                    </div>
                                    <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top:15px;">
                                        <div style="text-align:center;"><div style="font-size:0.7em; opacity:0.6;">Lembap</div><div>${cur.hu}%</div></div>
                                        <div style="text-align:center;"><div style="font-size:0.7em; opacity:0.6;">Angin</div><div>${cur.ws} km/j</div></div>
                                        <div style="text-align:center;"><div style="font-size:0.7em; opacity:0.6;">Awan</div><div>${cur.tcc}%</div></div>
                                    </div>
                                </div>`;
                            }
                        } catch (err) { finalOutput = "Gagal mengambil data cuaca."; }
                    }

                    const messageDiv = appendMessage({ role: 'assistant', content: '' });
                    messageDiv.innerHTML = finalOutput || aiFullText;
                    activeSession.push({ role: 'assistant', content: finalOutput || aiFullText });
                    saveSessions();
                    isAwaitingResponse = false;

                } else {
                    aiFullText = aiFullText.replace(/\$/g, '');
                    activeSession.push({ role: 'assistant', content: aiFullText });
                    saveSessions();
                    typewriterEffect(appendMessage({ role: 'assistant', content: '' }), aiFullText);
                }

            } catch (error) {
                if (typingIndicator) typingIndicator.remove();
                isAwaitingResponse = false;
                appendMessage({ role: 'assistant', content: `Waduh Error Bre: ${error.message}` });
            }
        };

        newChatBtn.onclick = createNewSession;
        sendButton.onclick = handleSendMessage;
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = `${Math.min(messageInput.scrollHeight, 200)}px`;
        });

        menuToggleBtn.onclick = () => { 
            if (window.innerWidth > 768) {
                appWrapper.classList.toggle('sidebar-closed');
                sidebar.classList.toggle('closed');
            } else {
                sidebar.classList.toggle('open'); 
                sidebarOverlay.classList.toggle('open'); 
            }
        };
        
        sidebarOverlay.onclick = () => { 
            sidebar.classList.remove('open'); 
            sidebarOverlay.classList.remove('open'); 
        };

        loadRegionData().then(() => loadSessions());
    }
});
