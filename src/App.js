import Editor from './Editor';
import InlineEditable from './InlineEditable';
import { Creatable } from 'react-select';
import 'react-select/dist/react-select.css';
import React, {Component} from 'react';
import Automerge from 'automerge';


function shrinkId(id) {
  if (id.length <= 12) return id;
  let front = id.substring(0, 6);
  let end = id.substring(id.length - 6);
  return `${front}...${end}`;
}


class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      doc: null,
      name: '',
      peers: [],
      docs: [],
      peerIds: {},
      lastDiffs: []
    };
  }

  componentDidMount() {
    this.props.hm.on('peer:message', (actorId, peer, msg) => {
      // keep track of peer ids
      if (msg.type === 'hi') {
        let peerIds = this.state.peerIds;
        let id = peer.remoteId.toString('hex');
        peerIds[id] = msg.id;
      }
    });

    this.props.hm.on('peer:joined', (actorId, peer) => {
      // tell new peers this peer's id
      this.props.hm._messagePeer(peer, {type: 'hi', id: this.props.id});
      this.setState({ peers: this.uniquePeers(this.state.doc) });
    });

    this.props.hm.on('peer:left', (actorId, peer) => {
      if (this.state.doc && peer.remoteId) {
        // remove the leaving peer from the editor
        let id = peer.remoteId.toString('hex');
        id = this.state.peerIds[id];
        let changedDoc = this.props.hm.change(this.state.doc, (changeDoc) => {
          delete changeDoc.peers[id];
        });
        this.setState({ doc: changedDoc, peers: this.uniquePeers(this.state.doc) });
      }
    });

    // remove self when closing window
    window.onbeforeunload = () => {
      let changedDoc = this.props.hm.change(this.state.doc, (changeDoc) => {
        delete changeDoc.peers[this.props.id];
      });
    }

    this.props.hm.on('document:updated', (docId, doc, prevDoc) => {
      if (this.state.doc && this.props.hm.getId(this.state.doc) == docId) {
        let diff = Automerge.diff(prevDoc, doc);
        let lastDiffs = diff.filter((d) => d.type === 'text');
        this.setState({ doc, lastDiffs });
        this.updateDocsList();
      }
    });

    this.props.hm.on('document:ready', (docId, doc, prevDoc) => {
      this.updateDocsList();
    });
  }

  listenForDocument() {
    this.props.hm.once('document:ready', (docId, doc, prevDoc) => {
      let changedDoc = this.props.hm.change(doc, (changeDoc) => {
        if (!changeDoc.text) {
          changeDoc.text = new Automerge.Text();
          changeDoc.title = 'Untitled';
          changeDoc.peers = {};
          changeDoc.comments = [];
        }
        changeDoc.peers[this.props.id] = {
          name: this.state.name
        };
      });
      this.setState({ doc: changedDoc, peers: this.uniquePeers(doc) });
    });
  }

  createNewDocument() {
    this.props.hm.create();
    this.listenForDocument();
  }

  selectDocument(selected) {
    let docId = selected.value;
    this.openDocument(docId);
  }

  openDocument(docId) {
    try {
      if (this.props.hm.has(docId)) {
        let doc = this.props.hm.find(docId);
        doc = this.props.hm.change(doc, (changeDoc) => {
          changeDoc.peers[this.props.id] = {
            name: this.state.name
          };
        });
        this.setState({ doc: doc, peers: this.uniquePeers(doc) });
      } else {
        this.props.hm.open(docId);
        this.listenForDocument();
      }
    } catch(e) {
      console.log(e);
    }
  }

  updateDocsList() {
    let docs = Object.keys(this.props.hm.docs).map((docId) => {
      return { value: docId, label: this.props.hm.docs[docId].title };
    }).filter((d) => d.label);
    this.setState({ docs });
  }

  onEdit(edits) {
    let doc = this.props.hm.change(this.state.doc, (changeDoc) => {
      edits.forEach((e) => {
        if (e.inserted) {
          changeDoc.text.insertAt(e.caret, ...e.changed);
        } else {
          for (let i=0; i<e.diff; i++) {
            changeDoc.text.deleteAt(e.caret);
          }
        }
      });
    });
    this.setState({ doc });
  }

  onEditTitle(title) {
    if (title) {
      let doc = this.props.hm.change(this.state.doc, (changeDoc) => {
        changeDoc.title = title;
      });
      this.setState({ doc });
      this.updateDocsList();
    }
  }

  onEditName(ev) {
    let name = ev.target.value;
    if (name && this.state.doc) {
      let doc = this.props.hm.change(this.state.doc, (changeDoc) => {
        changeDoc.peers[this.props.id].name = name;
      });
      this.setState({ doc });
    }
    this.setState({ name });
  }

  onChangeSelection(caretPos, caretIdx) {
    // update peers about caret position
    let doc = this.props.hm.change(this.state.doc, (changeDoc) => {
      changeDoc.peers[this.props.id].pos = caretPos;
      changeDoc.peers[this.props.id].idx = caretIdx;
    });
    this.setState({ doc });
  }

  uniquePeers(doc) {
    // count unique peers on document
    if (doc) {
      let peers = this.props.hm.feeds[this.props.hm.getId(doc)].peers;
      return [...new Set(peers.filter((p) => p.remoteId).map(p => p.remoteId.toString('hex')))];
    }
    return [];
  }

  render() {
    let main;
    if (this.state.doc) {
      main = (
        <div id='doc'>
          <InlineEditable className='doc-title' value={this.state.doc.title} onEdit={this.onEditTitle.bind(this)} />
          <div>{this.state.peers.length} peers</div>
          <Editor
            id={this.props.id}
            colors={this.props.colors}
            peers={this.state.doc.peers}
            comments={this.state.doc.comments}
            diffs ={this.state.lastDiffs}
            text={this.state.doc.text.join('')}
            onEdit={this.onEdit.bind(this)}
            onSelect={this.onChangeSelection.bind(this)} />
          <div className='doc-id'>Copy to share: <span>{this.props.hm.getId(this.state.doc)}</span></div>
        </div>
      );
    } else {
      // TODO these should be proper accessible links
      // which support browser history/clicking back
      main = (
        <div>
          <h2>Documents</h2>
          <ul id='doc-list'>
            {this.state.docs.map((d) => {
              return <li key={d.value}><a onClick={() => this.openDocument(d.value)}>{d.label}</a></li>;
            })}
          </ul>
        </div>
      );
    }

    return <main role='main'>
      <nav>
        <button onClick={this.createNewDocument.bind(this)}>Create new document</button>
        <input placeholder='Name' type='text' className='app-name' value={this.state.name} onChange={this.onEditName.bind(this)} />
        <Creatable
          style={{width: '12em'}}
          placeholder='Open document'
          onChange={this.selectDocument.bind(this)}
          options={this.state.docs}
          promptTextCreator={(label) => `Open '${shrinkId(label)}'`}
        />
      </nav>
      {main}
    </main>
  }
}

export default App;
