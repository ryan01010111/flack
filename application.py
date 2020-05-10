import os

from flask import Flask, session, render_template, request, json, jsonify, send_from_directory, abort
from flask_socketio import SocketIO, emit, join_room
import uuid

from classes import Message

app = Flask(__name__)
app.config.from_object("config.Config")
socketio = SocketIO(app)

displayNames = []
# create dictionary of channels
# each channel (key) pairs with an array (value) of messages (class)
channels = {
    "General": [],
    "1100100": []
    }

# simulate 100 messages (max per channel)
for i in range(100):
    m = Message(sender="Sim", text=f'#{bin(i).replace("0b", "")}')
    channels['1100100'].append(m)


@app.route("/")
def index():

    return render_template("index.html", channels=channels)


@app.route("/setDisplayName", methods=["POST"])
def set_display_name():
    
    requestedDisplayName = request.form.get("requestedDisplayName")

    if requestedDisplayName in displayNames:
        return jsonify({"success": False})
    else:
        displayNames.append(requestedDisplayName)
        return jsonify({"success": True})


@app.route("/addChannel", methods=["POST"])
def add_channel():

    newChannel = request.form.get("newChannel")

    if newChannel in channels:
        return jsonify({"success": False})
    else:
        channels[newChannel] = []
        return jsonify({"success": True})


@socketio.on("add channel")
def show_added_channel(data):

    emit("channel added", {"newChannel": data["newChannel"]}, broadcast=True)


@app.route("/<channel>")
def get_channel_messages(channel):

    if channel not in channels:
        return '<h1>Channel does not exist</h1>'

    else:

        messages = channels[channel]

        if len(messages) < 1:
            return jsonify({"messages": None})

        return jsonify({

            "messages": [msg.serialize() for msg in messages]
        })


@socketio.on('joined')
def joined(data):

    name = data["name"]
    room = data["room"]
    session["name"] = name
    session["room"] = room
    join_room(room)


@socketio.on("send message")
def send_message(data):
    
    sender = session["name"]
    text = data["text"]
    room = session["room"]
    msg = Message(sender=sender, text=text)

    if len(channels[room]) >= 100:
        channels[room].pop(0)

    channels[room].append(msg)
    emit("broadcast message", {"sender": sender, "text": text, "timestamp":msg.ftime()}, room=room)


@socketio.on("upload request")
def upload_request(filename, size):

    ext = os.path.splitext(filename)[1]
    if ext in app.config["FORBIDDEN_EXTENSIONS"]:
        return False
    
    fileId = uuid.uuid4().hex
    with open(app.config["FILEDIR"] + fileId + '.json', 'wt') as f:
        json.dump({'filename': filename, 'size': size}, f)
    
    with open(app.config["FILEDIR"] + fileId + ext, 'wb') as f:
        pass

    return fileId + ext


@socketio.on("send slice")
def write_file_slice(filename, offset, data):

    if not os.path.exists(app.config["FILEDIR"] + filename):
        return False
    
    try:
        with open(app.config["FILEDIR"] + filename, "r+b") as f:
            f.seek(offset)
            f.write(data)
    except IOError:
        return False
    
    return True


@socketio.on("file upload")
def broadcast_file_upload(filename, fileId):

    sender = session["name"]
    room = session["room"]
    msg = Message(sender=sender, text=filename)
    msg.fileId = fileId
    channels[room].append(msg)
    emit("broadcast message", {"sender": sender, "filename": filename, "fileId": fileId, "timestamp":msg.ftime()}, room=room)


@app.route("/uploads/<fileId>")
def get_file(fileId):

    try:
        return send_from_directory(app.config["FILEDIR"], filename=fileId, as_attachment=True)

    except FileNotFoundError:
        abort(404)




if __name__ == '__main__':
    socketio.run(app)
