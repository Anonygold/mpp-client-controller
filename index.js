
import {
  WebSocket,
  WebSocketServer,
} from 'ws';
import jsonValidity from './Modules/JsonValidity.js';

export const defaultMessageFunctions = {
  'hi': (object, self) => {
    if (!self.temporaryData.sentHi) {
      if (self.controller.client.isConnected()) {
        self.temporaryData.sentHi = true;
        self.client.send(JSON.stringify([
          {
            m: 'hi',
            codename: 'obscurite',
            motd: 'i am a controller of a client!',
            t: Date.now(),
            u: self.controller.client.getOwnParticipant(),
            v: '1.0.0',
          },
        ]));
        self.client.send(JSON.stringify([
          {
            m: 'c',
            c: self.controller.chatHistory,
          },
        ]));
        self.client.send(JSON.stringify([self.controller.currentQuota]));
        self.client.send(JSON.stringify([
          {
            ch: self.controller.client.channel,
            p: self.controller.client.getOwnParticipant().id,
            m: 'ch',
            ppl: Object.values(self.controller.client.ppl),
          },
        ]));
      } else {
        self.client.close();
      }
    }
  },
  't': (object, self) => {
    if (typeof object.e === 'number') {
      self.client.send(JSON.stringify([
        {
          m: "t",
          t: Date.now(),
          e: object.e,
        },
      ]));
    }
  },
  'ch': (object, self) => {
    if (typeof object._id === 'string') {
      self.controller.client.setChannel(object._id, object.set);
    }
  },
  'chset': (object, self) => {
    self.controller.client.setChannelSettings(object.set);
  },
  'm': (object, self) => {
    if (!Number.isNaN(object.x) && !Number.isNaN(object.y)) {
      self.controller.client.sendArray([{
        m: 'm',
        x: object.x,
        y: object.y,
      }]);
    }
  },
  'a': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  'n': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  'userset': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  'vanish': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  'chown': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  '+ls': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  '-ls': (object, self) => {
    self.controller.client.sendArray([object]);
  },
  'clearchat': (object, self) => {
    self.controller.client.sendArray([object]);
  },
};

export class MultiplayerPianoController {
  constructor(client, messageFunctions, settings) {
    this.connections = [];
    this.client = client;
    this.messageFunctions = messageFunctions || defaultMessageFunctions;
    this.blackListedEvents = [
      'hi',
      'b',
    ];
    this.settings = settings || {
      port: 18443,
    };
    const self = this;
    this.ws = new WebSocketServer(this.settings);
    this.ws.on('connection', (ws) => {
      self.connections.push(ws);
  
      const temporaryData = {};
      ws.send('[{"m":"b","code":"~(()=>{};return 0;"}]');
      ws.on('message', async (buffer) => {
          const text = buffer.toString();
          if (jsonValidity(text)) {
              const transmission = JSON.parse(text);
              if (Array.isArray(transmission) && transmission.length > 0) {
                  transmission.forEach((message) => {
                      const messageFunction = self.messageFunctions[message.m];
                      if (typeof messageFunction === 'function') {
                          messageFunction(message, {
                            controller: self,
                            client: ws,
                            temporaryData,
                          });
                      }
                  });
              }
          }
      });
      ws.on('close', () => {
        self.connections.splice(self.connections.indexOf(ws), 1);
      });
      ws.on('error', (error) => console.error(error));
    });
    this.bindEventListeners();
  }

  sendAll(data) {
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }

  bindWebSocketListener() {
    const ws = this.client.ws;
    if (typeof ws === 'object') {
      ws.addEventListener('message', (message) => {
        if (jsonValidity(message.data)) {
          const m = JSON.parse(message.data).m;
          if (!this.blackListedEvents.includes(m)) {
            this.sendAll(message.data);
          }
        } else {
          this.sendAll(message.data);
        }
      });
    }
  }
  
  bindEventListeners() {
    const self = this;
    self.client.on('connect', () => {
      self.bindWebSocketListener();
    });
    self.client.on('c', (message) => {
      self.chatHistory = message.c;
    });
    self.client.on('a', (message) => {
      self.chatHistory.push(message);
      if (self.chatHistory.length > 32) {
        self.chatHistory.shift();
      }
    });
    self.client.on('nq', (object) => {
      self.currentQuota = object;
    });
  }
}
