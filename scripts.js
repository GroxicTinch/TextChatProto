const MessageType = {
    TXT: 'txt',
    IMG: 'img',
    WAV: 'wav'
};

const OUTGOING = true;
const INCOMING = false;

// Version used for saves
const VERSION = 'v2';

document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        theme: {
            headerBg: "#211c36",
            headerText: "#e3e1e9",

            mainText: "#e3e1e9",
            bodyBg: "#151029",

            receivedBg: "#322e3e",
            receivedText: "#e3e1e9",
            sentBg: "#c19ed6",
            sentText: "#1c1a23",

            timestampText: "#ccc3d2",
            buttonHover: "#ffffff0F"
        },
        error: {
            show: false,
            text: ""
        },
        chat: {
            chatBodyElement:null,
            contact: "Click me to change contact name",
            contactImgSrc: "contact.png",
            messageInputText: "",
            messages: [],

            imgOverlaySrc: "",

            clear() {
                this.messages = [];
            },
            sendTxt(event, content, outgoing = !(event.shiftKey || event.ctrlKey)) {
                this.createMsg(content, outgoing, MessageType.TXT, true);
               
                this.messageInputText = "";
            },
            sendImg(content, outgoing = OUTGOING) {
                this.createMsg(content, outgoing, MessageType.IMG, true);
            },
            sendWav(content, outgoing = OUTGOING) {
                this.createMsg(content, outgoing, MessageType.WAV, true);
            },
            createMsg(content, outgoing, msgType = MessageType.TXT, scrollDown = false) {
                appStore.chat.messages.push({content, outgoing, msgType});

                if(scrollDown) {
                    setTimeout(() => {
                        this.scrollBottom();
                    }, 0);
                }
            },

            zoomImage(img) {                
                this.imgOverlaySrc = img.src;
            },
            // Message functions
            swapBubble(msgIndex = appStore.contextMenu.lastSelectedMessage) {
                const message = this.messages[msgIndex];
                message.outgoing = !message.outgoing;
            },
            editBubble(msgIndex = appStore.contextMenu.lastSelectedMessage) {
                const message = this.messages[msgIndex];
                
                switch(message.type) {
                    default:
                        const newText = prompt('Edit your message:', message.content);
                        if (newText !== null) {
                            message.content = newText;
                        }
                        break;
                }
            },
            deleteBubble(msgIndex = appStore.contextMenu.lastSelectedMessage) {
                this.messages.splice(msgIndex, 1);
            },
            insertBeforeBubble(msgType, msgIndex = appStore.contextMenu.lastSelectedMessage) {
                const message = this.messages[msgIndex];

                const content = "Edit Me!";
                const outgoing = message.outgoing;

                this.messages.splice(msgIndex, 0, {content, outgoing, msgType});
                console.log(this.messages)
            },
            changeTimestamp(msgIndex = appStore.contextMenu.lastSelectedMessage) {
                const message = this.messages[msgIndex];
                console.log('Change Timestamp');
            },

            scrollTop() {
                this.chatBodyElement.scrollTop = 0;
            },
            scrollBottom() {
                this.chatBodyElement.scrollTop = this.chatBodyElement.scrollHeight;
            }
        },
        contextMenu: {
            showMenu: false,
            messageSelected: -1,
            position: { top: 0, left: 0 },

            call(event, msgIndex) {
                this.lastSelectedMessage = msgIndex;

                event.preventDefault();
                if (event.ctrlKey) {
                    chatStore.swapBubble(msgIndex);
                    return;
                }

                // Calculate initial position
                let top = event.clientY;
                let left = event.clientX;

                // Get viewport dimensions
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;

                // Get context menu dimensions
                const menuWidth = 200; // Adjust this to the actual width of your context menu
                const menuHeight = 300; // Adjust this to the actual height of your context menu

                // Adjust position if the context menu is off-screen
                if (left + menuWidth > viewportWidth) {
                    left = viewportWidth - menuWidth;
                }
                if (top + menuHeight > viewportHeight) {
                    top = viewportHeight - menuHeight;
                }
                if (left < 0) {
                    left = 0;
                }
                if (top < 0) {
                    top = 0;
                }

                // Set adjusted position
                this.position.top = top;
                this.position.left = left;

                this.showMenu = true;
            }
        }
    });

    const appStore = Alpine.store('app');
    const chatStore = Alpine.store('app').chat;

    Alpine.data('contactHandler', () => ({
          // Contact Image
        triggerFileInput() {
            this.$refs.contactImageInput.click();
        },
        changeImageUrl() {
            const result = prompt('Enter URL:', chatStore.contactImgSrc);
            if (result !== null) {
                chatStore.contactImgSrc = result;
            }
        },
        updateContactImg() {
            const file = this.$refs.contactImageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    chatStore.contactImgSrc = reader.result;
                    this.$refs.contactImageInput.value = ''; // Clear the file input
                };
                reader.readAsDataURL(file);
            }
        },
    }));

    Alpine.data('fileInputHandler', () => ({
        droppingScreen: false,
        save() {
            const version = VERSION;
            const contactNameVal = chatStore.contact;
            const contactImgSrc = chatStore.contactImgSrc;
            const chatMessages = chatStore.messages;
        
            const chatData = {
                version,
                contactNameVal,
                contactImgSrc,
                chatMessages
            };
        
            const chatDataStr = JSON.stringify(chatData);
            const a = document.createElement("a");
            const file = new Blob([chatDataStr], { type: 'application/json' });
            a.href = URL.createObjectURL(file);
            a.download = 'chatData.cht';
            a.click();
        },
        load(inFile = null) {
            var file;

            if(inFile) {
                file = inFile;
            } else {
                file = this.$refs.loadInput.files[0];
            }

            if (file) {
                var warnVersionMismatch = false;
                chatStore.clear();

                const reader = new FileReader();
                reader.onload = (e) => {
                    const chatData = JSON.parse(e.target.result);
                    let ver = chatData.version;
                    
                    if(typeof ver === 'undefined') {
                        // This was preVersioning probably
                        ver = 'v2';

                        chatData.chatMessages.forEach(message => {
                            message.outgoing = (message.type === "sent");
                            delete message.type;

                            if(message.messageType === "msg") {
                                message.msgType = MessageType.TXT;
                            } else if (message.messageType === "img") {
                                message.msgType = MessageType.IMG;
                            }
                            delete message.messageType;
                        });

                        warnVersionMismatch = true;
                    }

                    chatStore.contact = chatData.contactNameVal;
                    chatStore.contactImgSrc = chatData.contactImgSrc;
                    
                    chatStore.messages = chatData.chatMessages;

                    if(warnVersionMismatch) {
                        appStore.error.show = true;
                        appStore.error.text = 'Save file was outdated, save this and override the old one';
                    }
                };
                reader.readAsText(file);
                chatStore.scrollTop();
            }
        },
        loadPrompt() {
            this.$refs.loadInput.click()
        },
        imgPrompt() {
            this.$refs.imageInput.click()
        },
        imgLoad(inFile = null, outgoing = OUTGOING) {
            var file;

            if(inFile) {
                file = inFile;
            } else {
                file = this.$refs.imageInput.files[0];
            }

            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    chatStore.sendImg(reader.result, outgoing);
                };
                reader.readAsDataURL(file);
            }
        },
        wavPrompt() {
            this.$refs.audioInput.click()
        },
        wavLoad(inFile = null, outgoing = OUTGOING) {
            var file;

            if(inFile) {
                file = inFile;
            } else {
                file = this.$refs.audioInput.files[0];
            }

            if(inFile) {
                file = inFile;
            }

            if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                    chatStore.sendWav(reader.result, outgoing);
                };
                reader.readAsDataURL(file);
            }
        },
        dragOver() {
            this.droppingScreen = true;
        },
        dragLeave() {
            this.droppingScreen = false;
        },
        handleDrop(event) {
            this.droppingScreen = false;
            const files = event.dataTransfer.files;
            this.handleFiles(files);
        },
        handleFiles(files) {
            Array.from(files).forEach(file => {
                const fileNameExploded = file.name.split('.');
                const fileExt = fileNameExploded[fileNameExploded.length-1];

                if (fileExt === 'cht') {
                    console.log('Dropped a .cht file');
                    this.load(file);
                } else if (file.type.startsWith('audio/')) {
                    console.log('Dropped an audio file');
                    this.wavLoad(file, INCOMING);
                } else if (file.type.startsWith('image/')) {
                    console.log('Dropped an image file');
                    this.imgLoad(file, INCOMING);
                } else {
                    console.log('Unsupported file\nType: ' + file.type + '\nExt: ' + fileExt);
                }
            });
        }
    }));

    document.documentElement.style.setProperty('--sentBackground', appStore.theme.sentBg);
    document.documentElement.style.setProperty('--receivedBackground', appStore.theme.receivedBg);
    document.documentElement.style.setProperty('--sentText', appStore.theme.sentText);
    document.documentElement.style.setProperty('--receivedText', appStore.theme.receivedText);

    createTestConvo();

    function createTestConvo() {
        chatStore.contact = "Greg";
        chatStore.createMsg("Hello!", OUTGOING);
        chatStore.createMsg("Hey", INCOMING);
        chatStore.createMsg("How are you?", OUTGOING);
        chatStore.createMsg("Still working?", OUTGOING);
        chatStore.createMsg("I am good! This is me at work!", INCOMING);
        chatStore.createMsg("contact.png", INCOMING, MessageType.IMG);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("https://steamuserimages-a.akamaihd.net/ugc/947329338759835128/7231933026029A252E9814F28B37C48CEE3F4AA0/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false", OUTGOING, MessageType.IMG);
        chatStore.createMsg("Wow! this is a test of a very very very very very very very very very very very very very very very very long message!", OUTGOING);
        chatStore.createMsg("Wow! this is also a test of a very very very very very very very very very very very very very very very very long message!", INCOMING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("Wow!", OUTGOING);
        chatStore.createMsg("https://www2.cs.uic.edu/~i101/SoundFiles/ImperialMarch60.wav", INCOMING, MessageType.WAV);
        chatStore.createMsg("https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav", OUTGOING, MessageType.WAV);
        chatStore.scrollBottom; //putting brackets on this causes the chatBodyElement to be set to null? What?
    }
});

// Catch all uncaught JavaScript errors
window.onerror = function(message, source, lineno, colno, error) {
    const errorMessage = `
        Message: ${message}
        Error object: ${JSON.stringify(error)}
    `;

    if (window.Alpine) {
        const appStore = Alpine.store('app');

        appStore.error.show = true;
        appStore.error.text = errorMessage;
    }
};

// Catch unhandled promise rejections
window.addEventListener('unhandledrejection', function(event) {
    const errorMessage = `
        Promise rejection: ${event.reason}
    `;

    if (window.Alpine) {
        const appStore = Alpine.store('app');

        appStore.error.show = true;
        appStore.error.text = errorMessage;
    }
});