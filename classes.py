
from datetime import datetime



class Message:

    def __init__(self, sender, text):

        self.timestamp = datetime.now()
        self.sender = sender
        self.text = text
        self.fileId = None

    def ftime(self):

        return self.timestamp.strftime("%b %d | %H:%M")

    def serialize(self):
        
        if self.fileId:

            return {

                "sender": self.sender,
                "text": self.text,
                "timestamp": self.ftime(),
                "fileId": self.fileId
            }

        else:

            return {

                "sender": self.sender,
                "text": self.text,
                "timestamp": self.ftime()
            }
