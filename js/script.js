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
        const AI_ENDPOINTS = {
            synapse: 'https://api.siputzx.my.id/api/ai/glm47flash',
            chatgpt: 'https://api.ikyyxd.my.id/ai/chatgpt',
            cici: 'https://api.ikyyxd.my.id/ai/cici',
            gemini: 'https://api.ikyyxd.my.id/ai/gemini'
        };
        const PHOTO_API_ENDPOINT = 'https://api.siputzx.my.id/api/m/ephoto360';
        const GPT_IMAGE_API = 'https://image.pollinations.ai/prompt/'; 
        const NEWS_API = 'https://api.ikyyxd.my.id/berita/google-news';
        const SSWEB_API = 'https://api.siputzx.my.id/api/tools/ssweb';
        const GEMPA_API = 'https://api.siputzx.my.id/api/info/bmkg'; 
        const WEATHER_API = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
        const BRAT_API = 'https://api.ikyyxd.my.id/canvas/bratv1'; 
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
        const aiSelector = document.getElementById('ai-selector');

        let sessionsData = {};
        let isAwaitingResponse = false;
        let regionContext = "";

        // --- FITUR BARU: UPSCALE LOGIC ---
        // Catatan: Karena upscale menggunakan axios/form-data di sisi client browser, 
        // pastikan library tersebut tersedia via CDN di HTML lu.
        const upscaleImage = async (imageUrl) => {
            try {
                const response = await fetch(`https://api.siputzx.my.id/api/tools/upscale?url=${encodeURIComponent(imageUrl)}`);
                const data = await response.json();
                return data.status ? data.url : null;
            } catch (e) {
                console.error("Upscale error:", e);
                return null;
            }
        };

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
9. Upscale: /exec upscale: [URL_GAMBAR]

[Instruksi Upscale]
Jika user mengirim gambar dan minta "upscale", "perjelas", atau "hd-in", ambil URL gambarnya dan jawab: /exec upscale: [URL].

[Referensi Kode Wilayah (Nama: Kode)]
${regionContext || "Data wilayah sedang dimuat..."}

[Kepribadian]
Gaya Bahasa: Santai, gunakan "gw", "lu", "bre". Jangan terlalu kaku.

[Bahasa]
Selalu gunakan Bahasa Indonesia yang natural dan santai.`
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
                const selectedAI = aiSelector.value;
                let finalUrl = "";

                if (selectedAI === "synapse") {
                    finalUrl = `${AI_ENDPOINTS.synapse}?prompt=${encodeURIComponent(userText)}&system=${encodeURIComponent(sysContent)}&temperature=0.7`;
                } else if (selectedAI === "chatgpt") {
                    finalUrl = `${AI_ENDPOINTS.chatgpt}?prompt=${encodeURIComponent(userText)}`;
                } else if (selectedAI === "cici") {
                    finalUrl = `${AI_ENDPOINTS.cici}?prompt=${encodeURIComponent(userText)}`;
                } else if (selectedAI === "gemini") {
                    finalUrl = `${AI_ENDPOINTS.gemini}?message=${encodeURIComponent(userText)}`;
                }

                const response = await fetch(finalUrl);
                if(typingIndicator) typingIndicator.remove();
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();
                let aiFullText = data.data?.response || data.response || data.result?.reply || data.result || data.data || "Gagal memuat respon.";
                
                // DETEKSI LOGIKA EXECUTION
                if (aiFullText.toLowerCase().includes("/exec")) {
                    let finalOutput = "";
                    let cleanText = aiFullText.split(/\/exec/i)[0].trim();

                    if (aiFullText.includes("upscale:")) {
                        const targetUrl = aiFullText.split("upscale:")[1].trim().split('\n')[0];
                        const resUpscale = await upscaleImage(targetUrl);
                        if(resUpscale) {
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}Nih Bre, gambarnya udah gw bikin HD:<br><img src="${resUpscale}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                        } else {
                            finalOutput = "Maaf Bre, gagal upscale gambarnya. Coba lagi nanti.";
                        }
                    }
                    else if (aiFullText.includes("ephoto360:")) {
                        const name = aiFullText.split("ephoto360:")[1].trim().split('\n')[0];
                        const effectUrl = "https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html";
                        const img = `${PHOTO_API_ENDPOINT}?url=${encodeURIComponent(effectUrl)}&text1=${encodeURIComponent(name)}`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${img}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    } 
                    else if (aiFullText.includes("gptimage:")) {
                        const prompt = aiFullText.split("gptimage:")[1].trim().split('\n')[0];
                        const randomSeed = Math.floor(Math.random() * 1000);
                        const img = `${GPT_IMAGE_API}${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${randomSeed}&nologo=true`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${img}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    }
                    else if (aiFullText.includes("brat:")) { 
                        const teksBrat = aiFullText.split("brat:")[1].trim().split('\n')[0];
                        const imgBrat = `${BRAT_API}?apikey=kyzz&text=${encodeURIComponent(teksBrat)}`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${imgBrat}" style="max-width:300px; width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    }
                    else if (aiFullText.includes("news:google")) {
                        const nRes = await fetch(NEWS_API);
                        const nData = await nRes.json();
                        if(nData.status) {
                            let newsList = nData.result.slice(0, 5).map(n => `<li><a href="${n.link}" style="color:var(--accent-color); font-weight:bold;">${n.title}</a></li>`).join('');
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<ul>${newsList}</ul>`;
                        }
                    }
                    else if (aiFullText.includes("ssweb:")) {
                        const urlTarget = aiFullText.split("ssweb:")[1].trim().split('\n')[0];
                        const ssImg = `${SSWEB_API}?url=${encodeURIComponent(urlTarget)}&device=desktop&theme=dark`;
                        finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<img src="${ssImg}" style="width:100%; border-radius:10px; border:2px solid var(--accent-color);">`;
                    }
                    else if (aiFullText.includes("gempa:bmkg")) {
                        const gRes = await fetch(GEMPA_API);
                        const gData = await gRes.json();
                        if(gData.status && gData.data.auto) {
                            const g = gData.data.auto.Infogempa.gempa;
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<div style="background:var(--bg-secondary); padding:15px; border-radius:10px; border:1px solid var(--accent-color);"><b>⚠️ INFO GEMPA</b><br>Wilayah: ${g.Wilayah}<br>Mag: ${g.Magnitude}<br>Potensi: ${g.Potensi}</div>`;
                        }
                    }
                    else if (aiFullText.includes("weather:")) {
                        const adm4 = aiFullText.split("weather:")[1].trim().split(' ')[0];
                        const wRes = await fetch(`${WEATHER_API}?adm4=${adm4}`);
                        const wData = await wRes.json();
                        if(wData.data) {
                            const cur = wData.data[0].cuaca[0][0];
                            finalOutput = `${cleanText ? cleanText + '<br><br>' : ''}<div style="background:var(--bg-secondary); padding:15px; border-radius:10px;">Cuaca di ${wData.data[0].lokasi.desa}: ${cur.weather_desc} (${cur.t}°C)</div>`;
                        }
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
