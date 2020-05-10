
// for file uploads

const slice_size = 68000;
var server_filename;

fileInput = document.querySelector('#file-input');
fileInput.onchange = function() {

    let file = fileInput.files[0];
    if (file.size > 500000000) {

        alert('File exceeds maximum file size (500MB)');
    }
};

const uploadForm = document.querySelector('#fileUploadForm');
uploadForm.onsubmit = () => {

    var file = fileInput.files[0];

    if (!file) {

        alert('No file selected');
        return false;
    }

    socket.emit('upload request', file.name, file.size, function(filename) {

        if (!filename){

            alert('That file type is not allowed');

        } else {

            server_filename = filename;
            readFileSlice(file, 0, slice_size, sendFileSlice.bind(file));
        }
    });

    uploadForm.reset();
    
    // upload completion animation
    fileUpload.querySelectorAll('*').forEach(el => {

        el.style.opacity = 0;
    });

    showComplete();

    setTimeout(() => {
        
        fileUpload.style.display = 'none';
        fileUpload.querySelectorAll('*').forEach(el => {

            el.style.opacity = 1;
        });
    }, 2500);

    return false;
};


function readFileSlice(file, offset, length, send) {

    let end_offset = offset + length;
    if (end_offset > file.size) {

        end_offset = file.size;
    }

    var reader = new FileReader();
    reader.onload = function(file, offset, length, e) {

        send(file, offset, length, e.target.result);
    }.bind(reader, file, offset, length);

    reader.readAsArrayBuffer(file.slice(offset, end_offset));
}


function sendFileSlice(file, offset, length, data) {

    if (!socket.connected) {

        // WebSocket was disconnected - wait for reconnect
        setTimeout(sendFileSlice.bind(this, file, offset, length, data), 5000);
        return;
    }

    socket.emit('send slice', server_filename, offset, data, function(success) {

        if (!success) {

            alert('Upload failed');
        }
    });

    end_offset = offset + length;
    if (end_offset < file.size) {

        readFileSlice(file, end_offset, slice_size, sendFileSlice.bind(file));

    } else {

        // upload finished
        socket.emit('file upload', file.name, server_filename);
        return;
    }
}


function showComplete() {

    var shape = document.querySelector('#upload-shape');
    var check = document.querySelector('#upload-check-svg');

    shape.classList.remove('run-animation');
    check.classList.remove('run-animation');

    void shape.offsetWidth;
    void check.offsetWidth;

    shape.classList.add('run-animation');
    check.classList.add('run-animation');

    shape.style.animationPlayState = 'running';
    check.style.animationPlayState = 'running';

}
