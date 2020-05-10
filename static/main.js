
const signInView = document.querySelector('#signIn');
const requestedDisplayName = document.querySelector('#requestedDisplayName');
const chatMessages = document.querySelector('#chatMessages');
const messageInput = document.querySelector('#message');
const addChannelForm = document.querySelector('#addChannelForm');
const newChannelInput = document.querySelector('#newChannel');
const fileUpload = document.querySelector('#fileUploadContainer');

// socketIO connection and events
var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

socket.on('connect', () => {

    // displayName prompt/fetch
    const displayName = localStorage.getItem('displayName');
    if (!displayName) {

        signInView.style.display = 'flex';
        requestedDisplayName.focus();

    } else {
    
        signIn(displayName);
    }

    document.querySelector('#chatBox').onsubmit = function() {

        let text = messageInput.value;
        if (!text || text === "") {

            return false;
        }

        socket.emit('send message', {'text': text});
        this.reset();
        return false;
    };
});

socket.on('broadcast message', data => {

    let newMsg = document.createElement('div');
    let head = document.createElement('div');
    let sender = document.createElement('p')
    sender.innerHTML = data.sender;
    head.appendChild(sender);
    let timestamp = document.createElement('span');
    timestamp.innerHTML = data.timestamp;
    head.appendChild(timestamp);
    head.className = 'message-head';
    newMsg.appendChild(head);
    let content = document.createElement('div');
    content.className = 'message-body';

    if (data.filename) {

        let anc = document.createElement('a');
        anc.innerHTML = data.filename;
        anc.href = '/uploads/' + data.fileId;
        content.appendChild(anc);

    } else {

        content.innerHTML = data.text;
    }

    newMsg.classList.add('msg');
    newMsg.appendChild(content);
    chatMessages.appendChild(newMsg);
    chatMessages.scrollTo(0, chatMessages.scrollHeight);
    newMsg.style.animationPlayState = 'running';
});

socket.on('channel added', data => {

    let newLi = document.createElement('li');
    let newA = document.createElement('a');
    newA.href = '';
    newA.dataset.channel = data.newChannel
    newA.innerHTML = data.newChannel;
    newA.onclick = () => {

        joinChannel(data.newChannel);
        return false;
    };

    // prevent default opacity on mobile sidebar
    newLi.style.opacity = 1;
    newA.style.opacity = 1;

    newLi.appendChild(newA);
    document.querySelector('#channelList').appendChild(newLi);
});


// event listeners
signInForm.onsubmit = setDisplayName;

document.querySelectorAll('[data-channel]').forEach(link => {

    link.onclick = () => {

        joinChannel(link.dataset.channel);
        return false;
    };
});

document.querySelector('#mobile-menu-btn').onclick = function() {

    let sidebar = document.querySelector('#sidebar');

    if (sidebar.style.marginLeft === '0px' || sidebar.style.marginLeft === '') {

        sidebar.style.marginLeft = '200px';
        setTimeout(() => {
            
            sidebar.querySelectorAll('*').forEach(el => {

                el.style.opacity = 1;
            });

        }, 700);

    } else {

        sidebar.querySelectorAll('*').forEach(el => {

            el.style.opacity = 0;
        });
        
        sidebar.style.marginLeft = 0;        
    }

};

document.querySelector('#showAddChannelBtn').onclick = function() {

    addChannelForm.style.display = addChannelForm.style.display === 'none' ? 'initial' : 'none';
    this.innerHTML = this.innerHTML === '+' ? '&#8211' : '+';
    newChannelInput.focus();
};

addChannelForm.onsubmit = addChannel;

document.querySelector('#showAttachmentBtn').onclick = () => {

    fileUpload.style.display = 'flex';
};

document.querySelector('#cancelUpload').onclick = () => {

    fileUpload.style.display = 'none';
    return false;
};


// function declarations
function setDisplayName() {

    const request = new XMLHttpRequest();
    const name = requestedDisplayName.value;
    request.open('POST', '/setDisplayName');

    request.onload = () => {

        const data = JSON.parse(request.responseText);

        if (data.success) {

            localStorage.setItem('displayName', name);
            signIn(name);

        } else if (!document.querySelector('#errorDisplayName')) {


            let errorMsg = document.createElement('p');
            errorMsg.id = 'errorDisplayName';
            errorMsg.innerHTML = "That display name is taken";
            requestedDisplayName.before(errorMsg);
        }
    }

    const data = new FormData();
    data.append('requestedDisplayName', name);

    request.send(data);
    return false;
}


function signIn(displayName) {

    signInView.style.display = 'none';
    document.querySelector('#appContent').style.display = 'flex';
    document.querySelector('#displayName').innerHTML = displayName;
    let room = localStorage.getItem('prevChannel') || 'General';
    joinChannel(room);
}


function joinChannel(channel) {

    chatMessages.innerHTML = "";
    socket.emit('joined', {'name': localStorage.getItem('displayName'), 'room': channel});
    localStorage.setItem('prevChannel', channel);
    document.querySelector('#currentChannel').innerHTML = '#' + channel;
    messageInput.focus();

    // fetch channel's messages
    const request = new XMLHttpRequest();
    request.open('GET', `/${channel}`);

    request.onload = () => {

        const data = JSON.parse(request.responseText);

        if (data.messages) {

            data.messages.forEach(msg => {


                let newMsg = document.createElement('div');
                let head = document.createElement('div');
                let sender = document.createElement('p')
                sender.innerHTML = msg.sender;
                head.appendChild(sender);
                let timestamp = document.createElement('span');
                timestamp.innerHTML = msg.timestamp;
                head.appendChild(timestamp);
                head.className = 'message-head';
                newMsg.appendChild(head);
                let content = document.createElement('div');
                content.className = 'message-body';

                if (msg.fileId) {

                    let anc = document.createElement('a');
                    anc.innerHTML = msg.text;
                    anc.href = '/uploads/' + msg.fileId;
                    content.appendChild(anc);

                } else {

                    content.innerHTML = msg.text;
                }

                newMsg.appendChild(content);
                chatMessages.appendChild(newMsg);

            });

            chatMessages.scrollTo(0, chatMessages.scrollHeight);

        } else {

            return;
        }
    }

    request.send();
}


function addChannel() {

    const newChannel = newChannelInput.value;
    const regex = /^[a-z0-9-_()!&]+$/i;
    if (!newChannel || !regex.test(newChannel) || newChannel.length > 18) {

        alert('Channel name must be 1-18 characters, and include only letters, numbers, and/or the following symbols: - _ ( ) ! &');
        return false;
    }

    const request = new XMLHttpRequest();
    request.open('POST', '/addChannel');

    request.onload = () => {

        const data = JSON.parse(request.responseText);

        if (data.success) {
            
            newChannelInput.value = '';
            socket.emit('add channel', {'newChannel': newChannel});
            addChannelForm.style.display = 'none';
            document.querySelector('#showAddChannelBtn').innerHTML = '+';
            joinChannel(newChannel);

        } else if (!document.querySelector('#errorAddChannel')) {

            let errorMsg = document.createElement('p');
            errorMsg.id = 'errorAddChannel';
            errorMsg.innerHTML = 'That channel already exists';
            newChannelInput.before(errorMsg);
        }
    }

    const data = new FormData();
        data.append('newChannel', newChannel);

        request.send(data);
        return false;
}
