// Catch all uncaught JavaScript errors
window.onerror = function(message, source, lineno, colno, error) {
    const errorMessage = `
        Message: ${message}
        Error object: ${JSON.stringify(error)}
    `;
    showErrorModal(errorMessage);
    // return true; // Prevents the default browser error handling
};

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    const errorMessage = `
        Promise rejection: ${event.reason}
    `;
    showErrorModal(errorMessage);
});

document.addEventListener('DOMContentLoaded', () => {
    const MessageType = {
        MSG: 'msg',
        IMG: 'img',
        WAV: 'wav'
    };

    const chatBody = document.getElementById('chatBody');
    const sendButton = document.getElementById('sendButton');

    const messageInput = document.getElementById('messageInput');
    const contactImageInput = document.getElementById('contactImageInput');

    const imageButton = document.getElementById('imageButton');
    const imageInput = document.getElementById('imageInput');

    const audioButton = document.getElementById('audioButton');
    const audioInput = document.getElementById('audioInput');

    const jsonInput = document.getElementById('jsonInput');
    
    const backArrowButton = document.getElementById('backArrow');
    const callButton = document.getElementById('call');
    const menuButton = document.getElementById('menu');

    const contactName = document.getElementById('contact-name');
    const contactImg = document.getElementById('contactImg');

    const upArrow = document.getElementById('upArrow');
    const downArrow = document.getElementById('downArrow');

    let chatMessages = [];

    sendButton.addEventListener('click', () => sendMessage('sent'));

    imageButton.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', () => sendImage('sent'));

    audioButton.addEventListener('click', () => audioInput.click());
    audioInput.addEventListener('change', () => sendAudio('sent'));

    jsonInput.addEventListener('change', () => loadChat());

    backArrowButton.addEventListener('click', () => clearChat());
    callButton.addEventListener('click', () => saveChat());
    menuButton.addEventListener('click', () => jsonInput.click());
    
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey || e.ctrlKey) {
                sendMessage('received')
            } else {
                sendMessage('sent');
            }
        }
    });

    contactImg.addEventListener('click', () => contactImageInput.click());
    contactImg.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const result = prompt('Enter URL:', "");
        if(result === null) { return; }
        contactImg.src = result;
    });
    contactImageInput.addEventListener('change', () => updateContactImg());

    const overlay = document.createElement('div');
    overlay.classList.add('image-overlay');
    document.body.appendChild(overlay);

    const checkScroll = () => {
        if (chatBody.scrollTop > 0) {
            upArrow.style.display = 'block';
        } else {
            upArrow.style.display = 'none';
        }

        if (chatBody.scrollTop + chatBody.clientHeight < chatBody.scrollHeight) {
            downArrow.style.display = 'block';
        } else {
            downArrow.style.display = 'none';
        }
    };

    upArrow.addEventListener('click', () => {
        chatBody.scrollTop = 0;
    });

    downArrow.addEventListener('click', () => {
        chatBody.scrollTop = chatBody.scrollHeight;
    });

    chatBody.addEventListener('scroll', checkScroll);

    // Add click event listener to overlay to hide it
    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    });

    // Handle drag and drop for images
    document.addEventListener('dragover', (event) => {
        event.preventDefault();
    });

    document.addEventListener('drop', (event) => {
        event.preventDefault();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    createChatBubble(content, "received", MessageType.IMG);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('audio/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const content = e.target.result;
                    createChatBubble(content, "received", MessageType.WAV);
                };
                reader.readAsDataURL(file);
            } else if (file.type.endsWith('/json')) {
                loadChat(file);
            } else {
                console.log(file.type);
            }
        }
    });

    createTestConvo();

    function updateContactImg() {
        const file = contactImageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                contactImg.src = reader.result;
                contactImageInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    }

    function sendMessage(type) {
        const messageText = messageInput.value.trim();
        if (messageText) {
            createChatBubble(messageText, type, MessageType.MSG);
            messageInput.value = '';
        }
        messageInput.focus();
    }

    function sendImage(type) {
        const file = imageInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                createChatBubble(reader.result, type, MessageType.IMG);
                imageInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    }

    function sendAudio(type) {
        const file = audioInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                createChatBubble(reader.result, type, MessageType.WAV);
                audioInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    }

    function createChatBubble(content, type, messageType = MessageType.MSG, insertBefore = null) {
        const bubble = document.createElement('div');
        bubble.classList.add('chat-bubble', type);

        switch(messageType) {
            case MessageType.IMG:
                const img = document.createElement('img');
                img.src = content;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '100%';
                bubble.appendChild(img);
                img.addEventListener('dblclick', () => toggleZoom(img));
                break;
            case MessageType.WAV:
                const audio = document.createElement('audio');
                audio.controls = true;
                const source = document.createElement('source');
                source.src = content;
                source.type = 'audio/wav';
                audio.appendChild(source);

                bubble.appendChild(audio);

                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                fetch(content)
                    .then(response => response.arrayBuffer())
                    .then(data => audioContext.decodeAudioData(data));
                    break;
            default:
                const span = document.createElement('span');
                span.textContent = content;
                bubble.appendChild(span);
                break;
        }

        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');

        var timestampOffset = 0;
        
        if (chatMessages.length === 0) {
            timestamp.dataset.timestamp = new Date();
        } else {
            timestampOffset = generateTimestampOffset();
        }

        timestamp.textContent = "";
        timestamp.dataset.timestampOffset = timestampOffset;
        bubble.appendChild(timestamp);

        bubble.classList.add(messageType.toLowerCase())

        if (insertBefore) {
            chatBody.insertBefore(bubble, insertBefore);
            chatMessages.splice(insertBefore, 0, { content, type, messageType, timestampOffset: timestampOffset });
        } else {
            chatBody.appendChild(bubble);
            chatMessages.push({ content, type, messageType, timestampOffset: timestampOffset });
        }
        chatBody.scrollTop = chatBody.scrollHeight;

        bubble.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, bubble);
        });

        // updateChatMessages();

        return bubble;
    }

    function showContextMenu(event, bubble) {
        if (event.ctrlKey) {
            swapBubble(bubble);
            return;
        }
        // Remove existing context menu if any
        const existingMenu = document.querySelector('.context-menu');
        if (existingMenu) existingMenu.remove();

        // Create the context menu
        const contextMenu = document.createElement('div');
        contextMenu.classList.add('context-menu');
        contextMenu.style.top = `${event.clientY}px`;
        contextMenu.style.left = `${event.clientX}px`;

        // Add menu items
        const editOption = document.createElement('div');
        editOption.textContent = 'Edit';
        editOption.addEventListener('click', () => editBubble(bubble));
        contextMenu.appendChild(editOption);

        const deleteOption = document.createElement('div');
        deleteOption.textContent = 'Delete';
        deleteOption.addEventListener('click', () => deleteBubble(bubble));
        contextMenu.appendChild(deleteOption);

        const swapOption = document.createElement('div');
        swapOption.textContent = 'Swap Sent/Received';
        swapOption.addEventListener('click', () => swapBubble(bubble));
        contextMenu.appendChild(swapOption);

        const insertTxtOption = document.createElement('div');
        insertTxtOption.textContent = 'Insert Message';
        insertTxtOption.addEventListener('click', () => insertBeforeBubble(bubble, MessageType.MSG));
        contextMenu.appendChild(insertTxtOption);

        const insertImgOption = document.createElement('div');
        insertImgOption.textContent = 'Insert Image';
        insertImgOption.addEventListener('click', () => insertBeforeBubble(bubble, MessageType.IMG));
        contextMenu.appendChild(insertImgOption);

        const timestampOption = document.createElement('div');
        timestampOption.textContent = 'Change Timestamp';
        timestampOption.addEventListener('click', () => changeTimestamp(bubble));
        contextMenu.appendChild(timestampOption);

        // Add the context menu to the body
        document.body.appendChild(contextMenu);

        // Adjust position if the context menu is off-screen
        const menuRect = contextMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (menuRect.right > viewportWidth) {
            contextMenu.style.left = `${viewportWidth - menuRect.width}px`;
        }
        if (menuRect.bottom > viewportHeight) {
            contextMenu.style.top = `${viewportHeight - menuRect.height}px`;
        }

        if (menuRect.left < 0) {
            contextMenu.style.left = `0px`;
        }
        if (menuRect.top < 0) {
            contextMenu.style.top = `0px`;
        }

        // Remove the context menu on click elsewhere
        document.addEventListener('click', () => contextMenu.remove(), { once: true });
    }

    function editBubble(bubble) {
        const isImage = bubble.querySelector('img') !== null;
        if (isImage) {
            const result = prompt('Edit your message:', bubble.childNodes[0].src);
            if(result === null) { return; }
            bubble.childNodes[0].src = result;
            return;
        } else {
            const currentText = bubble.childNodes[0].textContent;
            const newText = prompt('Edit your message:', currentText);
            if (newText !== null) {
                bubble.childNodes[0].textContent = newText;
                updateChatMessages();
            }
        }
    }

    function deleteBubble(bubble) {
        bubble.remove();
        updateChatMessages();
    }

    function swapBubble(bubble) {
        bubble.classList.toggle('sent');
        bubble.classList.toggle('received');
        updateChatMessages();
    }

    function insertBeforeBubble(bubble, messageType) {
        createChatBubble("Edit Me!", 'sent', messageType, bubble);
        updateChatMessages();
    }

    function changeTimestamp(bubble) {
        const newTimestamp = prompt('Enter new timestamp offset in seconds:', bubble.querySelector('.timestamp').dataset.timestampOffset);
        if (newTimestamp) {
            bubble.querySelector('.timestamp').dataset.timestampOffset = newTimestamp;
            updateChatMessages();
        }
    }

    function generateTimestampOffset() {    
        const randomSeconds = Math.floor(Math.random() * (120 - 30 + 1) + 30);
        return randomSeconds;
    }

    function updateChatMessages() {
        const bubbles = document.querySelectorAll('.chat-bubble');

        bubbles.forEach((bubble, i) => {
            let prev = i > 0 ? bubbles[i - 1] : null;
            const timestamp = bubble.querySelector('.timestamp');

            if(prev) {
                const prevTimeStamp = prev.querySelector('.timestamp');
                const newDate = new Date(prevTimeStamp.dataset.timestamp);

                newDate.setSeconds(newDate.getSeconds() + (timestamp.dataset.timestampOffset / 1));

                timestamp.dataset.timestamp = newDate;
                timestamp.textContent = newDate.toLocaleString();
            } else {
                timestamp.textContent = new Date(timestamp.dataset.timestamp).toLocaleString();
            }
        });
    }

    function saveChat() {
        const contactNameVal = document.getElementById('contact-name').value;
        const contactImgSrc = contactImg.src;
    
        const chatBubbles = document.querySelectorAll('.chat-bubble');
        let chatMessages = [];
    
        chatBubbles.forEach(bubble => {
            const type = bubble.classList.contains('sent') ? 'sent' : 'received';
            let content = '';
            let messageType = MessageType.MSG
    
            if (bubble.querySelector('img')) {
                content = bubble.querySelector('img').src;
                messageType = MessageType.IMG
            } else if (bubble.querySelector('audio')) {
                content = bubble.querySelector('source').src
                messageType = MessageType.WAV
            } else {
                content = bubble.querySelector('span').textContent;
            }
    
            chatMessages.push({
                content,
                type,
                messageType
            });
        });
    
        const chatData = {
            contactNameVal,
            contactImgSrc,
            chatMessages
        };
    
        const chatDataStr = JSON.stringify(chatData);
        const a = document.createElement("a");
        const file = new Blob([chatDataStr], { type: 'application/json' });
        a.href = URL.createObjectURL(file);
        a.download = 'chatData.json';
        a.click();
    }
    
    function loadChat(inFile = null) {
        var file = jsonInput.files[0];

        if(inFile) {
            file = inFile;
        }

        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const chatData = JSON.parse(e.target.result);
                contactName.value = chatData.contactNameVal;
                contactImg.src = chatData.contactImgSrc;
    
                const oldMessages = document.querySelectorAll('.chat-bubble');
                oldMessages.forEach(msg => msg.remove());
                
                let chatMessages = [];
                chatData.chatMessages.forEach(msg => {
                    // TEMP UNTIL MOVED OVER SAVE
                    const msg_type = (msg.isImage) ? MessageType.IMG : MessageType.MSG
                    // *************************
                    createChatBubble(msg.content, msg.type, msg.messageType);
                });
            };
            reader.readAsText(file);
            checkScroll();
        }
    }

    function clearChat() {
        const chatBubbles = document.querySelectorAll('.chat-bubble');
    
        let chatMessages = [];
        chatBubbles.forEach(bubble => {bubble.remove();})
    }

    function toggleZoom(img) {
        if (overlay.style.display === 'none' || overlay.style.display === '') {
            // Show the overlay and zoomed image
            const zoomedImage = document.createElement('img');
            zoomedImage.src = img.src;
            zoomedImage.classList.add('zoomed-image');
            overlay.innerHTML = '';
            overlay.appendChild(zoomedImage);
            overlay.style.display = 'flex';

            // Add zooming functionality on mouse wheel
            zoomedImage.addEventListener('wheel', (event) => {
                event.preventDefault();
                const scaleAmount = 0.1;
                let currentScale = Number(zoomedImage.dataset.scale) || 1;

                if (event.deltaY < 0) {
                    // Zoom in
                    currentScale += scaleAmount;
                } else {
                    // Zoom out
                    currentScale = Math.max(scaleAmount, currentScale - scaleAmount);
                }

                zoomedImage.dataset.scale = currentScale;
                zoomedImage.style.transform = `scale(${currentScale})`;
            });
        } else {
            // Hide the overlay
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        }
    }

    function createTestConvo() {
        contactName.value = "Greg";
        createChatBubble("Hello!", "sent");
        createChatBubble("Hey", "received");
        createChatBubble("How are you?", "sent");
        createChatBubble("Still working?", "sent");
        createChatBubble("I am good! This is me at work!", "received");
        createChatBubble("contact.png", "received", MessageType.IMG);
        createChatBubble("Wow!", "sent");
        createChatBubble("https://steamuserimages-a.akamaihd.net/ugc/947329338759835128/7231933026029A252E9814F28B37C48CEE3F4AA0/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false", "sent", MessageType.IMG);
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
        createChatBubble("Wow!", "sent");
    }

    // Function to encode a string to Base64
    function encodeString(str) {
        return btoa(encodeURIComponent(str));
    }

    // Function to decode a Base64 string
    function decodeString(encodedStr) {
        return decodeURIComponent(atob(encodedStr));
    }
});

// Function to display the error modal
function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const errorMessage = document.getElementById('errorMessage');
    const closeButton = document.querySelector('.close-button');

    errorMessage.textContent = message;
    modal.style.display = 'flex';

    closeButton.onclick = function() {
        modal.style.display = 'none';
    };

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}