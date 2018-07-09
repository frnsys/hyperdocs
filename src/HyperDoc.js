import crypto from 'crypto';
import EventEmitter from 'events';
import { Value, Operation, Operations } from 'slate';

function hash(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

const initialValue = Value.fromJSON({
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
});


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
        if (!changeDoc.ops) {
          changeDoc.ops = [];
          changeDoc.title = 'Untitled';
          changeDoc.peers = {};
          changeDoc.comments = {};
          changeDoc.hash = '';
        }
      });

      hyd._setDoc(doc);
      hyd.emit('ready', hyd);
    });
  }

  _setDoc(doc) {
    this.doc = doc;
    this.lastOp = 0;
    this.lastHash = '';
    this._applyOps(doc.ops);
    this.id = this.hm.getId(doc);
    this.ready = true;
  }

  get peers() {
    return this.doc.peers;
  }

  get nPeers() {
    return Object.keys(this.doc.peers).length;
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

  _applyOps(ops) {
    if (ops.length > 0) {
      console.log('---');
      this.applyUpdates(ops.map(Operation.fromJSON));
      ops.forEach((op) => {
        console.log(`op id: ${op.id}`);
        console.log(`prev hash: "${this.lastHash}"`);
        this.lastHash = hash(`${this.lastHash}${op.id}`);
        console.log(`new hash: "${this.lastHash}"`);
        this.lastOp++;
      });
      console.log(`doc hash: ${doc.hash}`);
      // if this is false, then this document has diverged
      // from the canonical sequence of operations
      // either re-apply ops from the very start
      // (will lose selection)
      // or rollback to some known snapshot?
      // (would still lose selection afaik)
      console.log(this.lastHash == doc.hash);
      console.log('---');
    }
  }

  _onUpdate(docId, doc, prevDoc) {
    if (this.id == docId) {
      this.doc = doc;

      let ops = doc.ops.slice(this.lastOp);
      this._applyOps(ops);

      this.emit('updated', this);
    }
  }

  setSelection(peerId, caretPos) {
    // update peers about caret position
    this._changeDoc((changeDoc) => {
      changeDoc.peers[peerId].pos = caretPos;
    });
  }

  setName(peerId, name) {
    this._changeDoc((changeDoc) => {
      changeDoc.peers[peerId].name = name;
    });
  }

  addChanges(ops) {
    ops = ops.filter((o) => {
      return o.type != 'set_selection' && o.type != 'set_value'
    }).toJSON().map((o) => {
      o.id = crypto.randomBytes(8).toString('hex')
      if (o.properties && o.properties.type === undefined) {
        o.properties.type = null;
      }
      return o;
    });

    if (ops.length > 0) {
      this._changeDoc((changeDoc) => {
        ops.forEach((op) => {
          console.log(`op id: ${op.id}`);
          console.log(`prev hash: "${this.lastHash}"`);
          this.lastHash = hash(`${this.lastHash}${op.id}`);
          this.lastOp++;
          console.log(`new hash: "${this.lastHash}"`);
        });
        changeDoc.ops.push(...ops);
        changeDoc.hash = this.lastHash;
      });
    }
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
