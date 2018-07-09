import crypto from 'crypto';
import EventEmitter from 'events';
import { Value } from 'slate';

const initialValue = {
  document: {
    nodes: [{
      object: 'block',
      type: 'paragraph',
      nodes: [{
        object: 'text',
        leaves: [{
          text: '',
        }],
      }],
    }]
  }
};



class HyperDoc extends EventEmitter {
  constructor(doc) {
    super();

    // ugh hacky
    this.hm = HyperDoc.hm;

    if (doc) {
      this._setDoc(doc);
    } else {
      this.ready = false;
    }
    this.diffs = [];

    this.hm.on('document:updated', this._onUpdate.bind(this));
  }

  static new() {
    let hyd = new HyperDoc();
    this.hm.create();
    this.listenForDoc(hyd);
    return hyd;
  }

  static open(id) {
    if (this.hm.has(id)) {
      let doc = this.hm.find(id);
      return new HyperDoc(doc);
    } else {
      let hyd = new HyperDoc();
      this.hm.open(id);
      this.listenForDoc(hyd);
      return hyd;
    }
  }

  static listenForDoc(hyd) {
    this.hm.once('document:ready', (docId, doc, prevDoc) => {
      doc = this.hm.change(doc, (changeDoc) => {
        if (!changeDoc.value) {
          changeDoc.value = initialValue;
          changeDoc.title = 'Untitled';
          changeDoc.peers = {};
          changeDoc.comments = {};
        }
      });

      hyd._setDoc(doc);
      hyd.emit('ready', hyd);
    });
  }

  _setDoc(doc) {
    this.doc = doc;
    this._value = Value.fromJSON(doc.value);
    this.id = this.hm.getId(doc);
    this.ready = true;
  }

  get peers() {
    return this.doc.peers;
  }

  get nPeers() {
    return Object.keys(this.doc.peers).length;
  }

  get value() {
    return this._value;
  }

  get title() {
    return this.doc.title;
  }

  set title(title) {
    this._changeDoc((changeDoc) => {
      changeDoc.title = title;
    });
  }

  get comments() {
    return this.doc.comments;
  }

  _changeDoc(changeFn) {
    this.doc = this.hm.change(this.doc, changeFn);
    this.emit('updated', this);
  }

  _onUpdate(docId, doc, prevDoc) {
    if (this.id == docId) {
      this.doc = doc;
      this._value = Value.fromJSON(doc.value);
      this.emit('updated', this);
    }
  }

  setName(peerId, name) {
    this._changeDoc((changeDoc) => {
      changeDoc.peers[peerId].name = name;
    });
  }

  updateValue(value) {
    this._changeDoc((changeDoc) => {
      changeDoc.value = value.toJSON();
      this._value = value;
    });
  }

  join(id, name, color) {
    this._changeDoc((changeDoc) => {
      changeDoc.peers[id] = {
          id: id,
          name: name,
          color: color
      };
    });
  }

  leave(id) {
    this._changeDoc((changeDoc) => {
      delete changeDoc.peers[id];
    });
  }

  addComment(peerId, threadId, body) {
    if (!body) return;
    if (!threadId) {
      threadId = crypto.randomBytes(32).toString('hex');
    }

    this._changeDoc((changeDoc) => {
      // TODO ideally this uses persistent id or sth
      let name = changeDoc.peers[peerId].name;
      let commentId = crypto.randomBytes(32).toString('hex');
      let comment = {
        id: commentId,
        created: Date.now(),
        author: name,
        body: body
      };

      if (threadId in changeDoc.comments) {
        changeDoc.comments[threadId].thread.push(comment);
      } else {
        changeDoc.comments[threadId] = {
          id: threadId,
          resolved: false,
          thread: [comment]
        };
      }
    });
    return threadId;
  }

  resolveComment(threadId) {
    this._changeDoc((changeDoc) => {
      changeDoc.comments[threadId].resolved = true;
    });
  }
}

export default HyperDoc;
