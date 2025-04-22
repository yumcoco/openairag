// DOM Elements
const chatArea = document.getElementById('chatArea');
const messageInput = document.getElementById('messageInput');
const submitBtn = document.getElementById('submitBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');
const welcomeMessage = document.getElementById('welcomeMessage');
const toggleSidebarBtn = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('sidebar');
const uploadMenuButton = document.getElementById('uploadMenuButton');
const uploadMenu = document.getElementById('uploadMenu');

// State variables
let currentEventSource = null;
let currentChatId = null;

// Ensure marked.js is properly configured
document.addEventListener('DOMContentLoaded', function() {
    // Set options for marked
    if (typeof marked !== 'undefined') {
        try {
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: true
            });
            console.log("Marked.js configured successfully");
        } catch (e) {
            console.error("Error configuring marked.js:", e);
        }
    } else {
        console.warn("marked.js not found - Markdown rendering may not work correctly");
    }

    // Initialize chat history
    initializeChat();
});

// Initialize chat and load history
function initializeChat() {
    console.log("Initializing chat...");

    // Load RAG options
    loadRagOptions();

    // Update chat list
    updateChatList();

    // Load current chat if it exists
    const savedChatId = localStorage.getItem('currentChatId');
    console.log("Saved chat ID:", savedChatId);

    if (savedChatId) {
        try {
            loadChat(savedChatId);
        } catch (e) {
            console.error("Error loading saved chat:", e);
            createNewChat(); // Fallback to creating a new chat
        }
    } else {
        // No saved chat, create a new one
        createNewChat();
    }

    // Initial check for mobile devices
    if (window.innerWidth <= 768) {
        sidebar.classList.add('-translate-x-full');
    }

    updateSidebarIcon();
    console.log("Chat initialized");
}

// Function to load RAG options from API
function loadRagOptions() {
    const ragSelect = document.getElementById('ragSelect');

    fetch('http://localhost:8090/api/v1/rag/query_rag_tag_list')
        .then(response => response.json())
        .then(data => {
            if (data.code === '0000' && data.data) {
                // Clear existing options (keep the first default option)
                while (ragSelect.options.length > 1) {
                    ragSelect.remove(1);
                }

                // Add new options
                data.data.forEach(tag => {
                    const option = new Option(`RAG: ${tag}`, tag);
                    ragSelect.add(option);
                });
            }
        })
        .catch(error => {
            console.error('Failed to load knowledge base list:', error);
        });
}

// Chat Management Functions
function createNewChat() {
    const chatId = Date.now().toString();
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);

    localStorage.setItem(`chat_${chatId}`, JSON.stringify({
        name: 'New Chat',
        messages: []
    }));

    updateChatList();
    clearChatArea();
}

function deleteChat(chatId) {
    if (confirm('Are you sure you want to delete this chat?')) {
        localStorage.removeItem(`chat_${chatId}`);

        if (currentChatId === chatId) {
            createNewChat();
        }

        updateChatList();
    }
}

function updateChatList() {
    chatList.innerHTML = '';
    const chats = Object.keys(localStorage)
        .filter(key => key.startsWith('chat_'));

    // Reorder list to show current chat first
    const currentChatIndex = chats.findIndex(key => key.split('_')[1] === currentChatId);
    if (currentChatIndex !== -1) {
        const currentChat = chats[currentChatIndex];
        chats.splice(currentChatIndex, 1);
        chats.unshift(currentChat);
    }

    chats.forEach(chatKey => {
        let chatData;
        try {
            chatData = JSON.parse(localStorage.getItem(chatKey));
            const chatId = chatKey.split('_')[1];

            // Data migration: convert old array format to new object format
            if (Array.isArray(chatData)) {
                chatData = {
                    name: `Chat ${new Date(parseInt(chatId)).toLocaleDateString()}`,
                    messages: chatData
                };
                localStorage.setItem(chatKey, JSON.stringify(chatData));
            }

            const li = document.createElement('li');
            li.className = `chat-item flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors ${chatId === currentChatId ? 'bg-purple-50' : ''}`;
            li.innerHTML = `
                <div class="flex-1">
                    <div class="text-sm font-medium">${chatData.name}</div>
                    <div class="text-xs text-gray-400">${new Date(parseInt(chatId)).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                </div>
                <div class="chat-actions flex items-center gap-1 opacity-0 transition-opacity duration-200">
                    <button class="p-1 hover:bg-gray-200 rounded text-gray-500" onclick="renameChat('${chatId}')">Rename</button>
                    <button class="p-1 hover:bg-red-200 rounded text-red-500" onclick="deleteChat('${chatId}')">Delete</button>
                </div>
            `;

            li.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-actions')) {
                    loadChat(chatId);
                }
            });

            li.addEventListener('mouseenter', () => {
                li.querySelector('.chat-actions').classList.remove('opacity-0');
            });

            li.addEventListener('mouseleave', () => {
                li.querySelector('.chat-actions').classList.add('opacity-0');
            });

            chatList.appendChild(li);
        } catch (e) {
            console.error(`Error processing chat ${chatKey}:`, e);
        }
    });
}

// Context Menu Management
let currentContextMenu = null;

function showChatContextMenu(event, chatId) {
    event.stopPropagation();
    closeContextMenu();

    const buttonRect = event.target.closest('button').getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.position = 'fixed';
    menu.style.left = `${buttonRect.left}px`;
    menu.style.top = `${buttonRect.bottom + 4}px`;

    menu.innerHTML = `
        <div class="context-menu-item" onclick="renameChat('${chatId}')">
            <i class="fas fa-edit"></i>
            Rename
        </div>
        <div class="context-menu-item text-red-500" onclick="deleteChat('${chatId}')">
            <i class="fas fa-trash"></i>
            Delete
        </div>
    `;

    document.body.appendChild(menu);
    currentContextMenu = menu;

    // Close menu when clicking outside
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu, { once: true });
    });
}

function closeContextMenu() {
    if (currentContextMenu) {
        currentContextMenu.remove();
        currentContextMenu = null;
    }
}

function renameChat(chatId) {
    const chatKey = `chat_${chatId}`;
    const chatData = JSON.parse(localStorage.getItem(chatKey));
    const currentName = chatData.name || `Chat ${new Date(parseInt(chatId)).toLocaleString()}`;
    const newName = prompt('Enter a new name for this chat:', currentName);

    if (newName) {
        chatData.name = newName;
        localStorage.setItem(chatKey, JSON.stringify(chatData));
        updateChatList();
    }
}

function loadChat(chatId) {
    currentChatId = chatId;
    localStorage.setItem('currentChatId', chatId);
    clearChatArea();

    // Get chat data with proper error handling
    let chatData;
    try {
        const storedData = localStorage.getItem(`chat_${chatId}`);
        if (!storedData) {
            console.error("No chat data found for ID:", chatId);
            chatData = { messages: [] };
        } else {
            chatData = JSON.parse(storedData);

            // If it's an array (old format), convert it
            if (Array.isArray(chatData)) {
                chatData = {
                    name: `Chat ${new Date(parseInt(chatId)).toLocaleDateString()}`,
                    messages: chatData
                };
                // Save converted format back to localStorage
                localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
            }

            // Make sure messages array exists
            if (!chatData.messages) {
                console.error("Chat data has no messages array:", chatData);
                chatData.messages = [];
                localStorage.setItem(`chat_${chatId}`, JSON.stringify(chatData));
            }
        }
    } catch (e) {
        console.error("Error parsing chat data:", e);
        chatData = { messages: [] };
    }

    // Add messages to chat area
    if (chatData.messages && chatData.messages.length > 0) {
        chatData.messages.forEach(msg => {
            try {
                appendMessage(msg.content, msg.isAssistant, false);
            } catch (e) {
                console.error("Error appending message:", e);
            }
        });
    }

    updateChatList();
    console.log("Loaded chat:", chatId, "with", chatData.messages?.length || 0, "messages");
}

function clearChatArea() {
    chatArea.innerHTML = '';
    welcomeMessage.style.display = 'flex';
}

// Message Handling
function appendMessage(content, isAssistant = false, saveToStorage = true) {
    if (!content) {
        console.warn("Attempted to append empty message");
        return;
    }

    welcomeMessage.style.display = 'none';

    console.log("Appending message:", isAssistant ? "AI" : "User", content.substring(0, 50) + "...");

    // Create container for alignment
    const containerDiv = document.createElement('div');
    containerDiv.className = `max-w-4xl mx-auto mb-4 ${isAssistant ? 'flex justify-start' : 'flex justify-end'}`;

    // Create message bubble
    const messageDiv = document.createElement('div');

    if (isAssistant) {
        // AI message style - with markdown rendering
        messageDiv.className = 'p-4 rounded-lg bg-gray-100 max-w-[85%] markdown-body relative';

        try {
            // Make sure content is a string
            const contentStr = String(content);
            const renderedContent = DOMPurify.sanitize(marked.parse(contentStr));
            messageDiv.innerHTML = renderedContent;
        } catch (e) {
            console.error("Error rendering markdown:", e);
            messageDiv.textContent = content; // Fallback to plain text
        }

        // Add copy button - ensure it's always added for AI messages
        const copyBtn = document.createElement('button');
        copyBtn.className = 'absolute top-2 right-2 p-1 bg-gray-200 rounded-md text-xs';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(content).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy', 2000);
            });
        };
        messageDiv.appendChild(copyBtn);
    } else {
        // User message style with gradient
        messageDiv.className = 'p-4 rounded-lg bg-gradient-to-r from-purple-500 to-purple-700 text-white max-w-[85%]';
        messageDiv.textContent = content;
    }

    containerDiv.appendChild(messageDiv);
    chatArea.appendChild(containerDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    // Only save to local storage when needed
    if (saveToStorage && currentChatId) {
        try {
            const chatKey = `chat_${currentChatId}`;
            const chatDataJson = localStorage.getItem(chatKey) || '{"name": "New Chat", "messages": []}';
            const chatData = JSON.parse(chatDataJson);

            // Ensure messages property exists
            if (!chatData.messages) {
                chatData.messages = [];
            }

            // Add message to messages array
            chatData.messages.push({ content, isAssistant });

            // Save back to localStorage
            localStorage.setItem(chatKey, JSON.stringify(chatData));
            console.log("Saved message to chat:", currentChatId);
        } catch (e) {
            console.error("Error saving message to localStorage:", e);
        }
    }
}

function showTypingIndicator() {
    // Create container for left alignment
    const containerDiv = document.createElement('div');
    containerDiv.id = 'typingIndicator';
    containerDiv.className = 'max-w-4xl mx-auto mb-4 flex justify-start';

    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'p-4 rounded-lg bg-gray-100 markdown-body relative fade-in max-w-[85%]';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';

    // Add three dots
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        indicator.appendChild(dot);
    }

    indicatorDiv.appendChild(indicator);
    containerDiv.appendChild(indicatorDiv);
    chatArea.appendChild(containerDiv);
    chatArea.scrollTop = chatArea.scrollHeight;

    return containerDiv;
}

function startEventStream(message) {
    if (currentEventSource) {
        currentEventSource.close();
    }

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    // Get API parameters
    const ragTag = document.getElementById('ragSelect').value;
    const aiModelSelect = document.getElementById('aiModel');
    const aiModelValue = aiModelSelect.value;
    const aiModelModel = aiModelSelect.options[aiModelSelect.selectedIndex].getAttribute('model');

    // Build API URL
    let url;
    if (ragTag) {
        url = `http://localhost:8090/api/v1/${aiModelValue}/generate_stream_rag?message=${encodeURIComponent(message)}&ragTag=${encodeURIComponent(ragTag)}&model=${encodeURIComponent(aiModelModel)}`;
    } else {
        url = `http://localhost:8090/api/v1/${aiModelValue}/generate_stream?message=${encodeURIComponent(message)}&model=${encodeURIComponent(aiModelModel)}`;
    }

    currentEventSource = new EventSource(url);
    let accumulatedContent = '';
    let tempContainerDiv = null;
    let tempMessageDiv = null;

    currentEventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);

            if (data.result?.output?.content) {
                const newContent = data.result.output.content;
                accumulatedContent += newContent;

                // Create temporary message container on first content
                if (!tempMessageDiv) {
                    // Remove typing indicator
                    if (typingIndicator && chatArea.contains(typingIndicator)) {
                        chatArea.removeChild(typingIndicator);
                    }

                    // Create container div with left alignment
                    tempContainerDiv = document.createElement('div');
                    tempContainerDiv.className = 'max-w-4xl mx-auto mb-4 flex justify-start';

                    // Create message bubble
                    tempMessageDiv = document.createElement('div');
                    tempMessageDiv.className = 'p-4 rounded-lg bg-gray-100 max-w-[85%] relative fade-in';

                    tempContainerDiv.appendChild(tempMessageDiv);
                    chatArea.appendChild(tempContainerDiv);
                    welcomeMessage.style.display = 'none';
                }

                // Update text content (don't parse Markdown yet)
                tempMessageDiv.textContent = accumulatedContent;
                chatArea.scrollTop = chatArea.scrollHeight;
            }

            if (data.result?.output?.properties?.finishReason === 'STOP') {
                currentEventSource.close();

                // Final rendering after stream is complete
                const finalContent = accumulatedContent;

                if (tempMessageDiv) {
                    try {
                        tempMessageDiv.className = 'p-4 rounded-lg bg-gray-100 max-w-[85%] markdown-body relative';
                        tempMessageDiv.innerHTML = DOMPurify.sanitize(marked.parse(finalContent));

                        // Add copy button
                        const copyBtn = document.createElement('button');
                        copyBtn.className = 'absolute top-2 right-2 p-1 bg-gray-200 rounded-md text-xs';
                        copyBtn.textContent = 'Copy';
                        copyBtn.onclick = () => {
                            navigator.clipboard.writeText(finalContent).then(() => {
                                copyBtn.textContent = 'Copied!';
                                setTimeout(() => copyBtn.textContent = 'Copy', 2000);
                            });
                        };
                        tempMessageDiv.appendChild(copyBtn);
                    } catch (e) {
                        console.error("Error in final rendering:", e);
                        tempMessageDiv.textContent = finalContent; // Fallback to plain text
                    }
                }

                // Save to local storage
                if (currentChatId) {
                    try {
                        const chatKey = `chat_${currentChatId}`;
                        const chatDataJson = localStorage.getItem(chatKey) || '{"name": "New Chat", "messages": []}';
                        const chatData = JSON.parse(chatDataJson);

                        if (!chatData.messages) {
                            chatData.messages = [];
                        }

                        chatData.messages.push({ content: finalContent, isAssistant: true });
                        localStorage.setItem(chatKey, JSON.stringify(chatData));

                        console.log("Saved AI response to chat:", currentChatId);
                    } catch (e) {
                        console.error("Error saving AI response to localStorage:", e);
                    }
                }
            }
        } catch (e) {
            console.error('Error parsing event data:', e);

            // Handle error in UI
            if (typingIndicator && chatArea.contains(typingIndicator)) {
                chatArea.removeChild(typingIndicator);
            }

            if (!tempMessageDiv) {
                appendMessage("Error processing response. Please try again.", true, false);
            }
        }
    };

    currentEventSource.onerror = function(error) {
        console.error('EventSource error:', error);
        currentEventSource.close();

        // Remove typing indicator and show error message
        if (typingIndicator && chatArea.contains(typingIndicator)) {
            chatArea.removeChild(typingIndicator);
        }

        if (!tempMessageDiv) {
            // appendMessage("Connection error. Please check your server or try again later.", true, false);
        }
    };
}

// Event Handlers
function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    if (!currentChatId) {
        createNewChat();
    }

    appendMessage(message, false);
    messageInput.value = '';
    startEventStream(message);
}

// Event Listeners
submitBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

newChatBtn.addEventListener('click', createNewChat);

toggleSidebarBtn.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
    updateSidebarIcon();
});

// Upload Menu Controls
uploadMenuButton.addEventListener('click', (e) => {
    e.stopPropagation();
    uploadMenu.classList.toggle('hidden');
});

// Close upload menu when clicking outside
document.addEventListener('click', (e) => {
    if (!uploadMenu.contains(e.target) && e.target !== uploadMenuButton) {
        uploadMenu.classList.add('hidden');
    }
});

// Handle upload menu item clicks
document.querySelectorAll('#uploadMenu a').forEach(item => {
    item.addEventListener('click', () => {
        uploadMenu.classList.add('hidden');
    });
});

// Responsive design handling
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
    updateSidebarIcon();
});

function updateSidebarIcon() {
    const iconPath = document.getElementById('sidebarIconPath');
    if (sidebar.classList.contains('-translate-x-full')) {
        iconPath.setAttribute('d', 'M4 6h16M4 12h4m12 0h-4M4 18h16');
    } else {
        iconPath.setAttribute('d', 'M4 6h16M4 12h16M4 18h16');
    }
}

// Make functions available globally
window.createNewChat = createNewChat;
window.deleteChat = deleteChat;
window.renameChat = renameChat;
window.loadChat = loadChat;
window.showChatContextMenu = showChatContextMenu;
window.closeContextMenu = closeContextMenu;