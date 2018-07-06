import Doc from './Document';
import HyperDoc from './HyperDoc';
import InlineEditable from './InlineEditable';
import React, {Component} from 'react';
import Automerge from 'automerge';
import { Creatable } from 'react-select';
import 'react-select/dist/react-select.css';


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
      docs: [],
      peerIds: {},
      name: props.id.substr(0, 6),
      color: props.colors[parseInt(props.id, 16) % props.colors.length]
    };
  }

  registerPeer(peer, msg) {
    // keep track of peer ids
    let peerIds = this.state.peerIds;
    let id = peer.remoteId.toString('hex');
    peerIds[id] = msg.id;
  }

  registerWithPeer(peer) {
    // tell new peers this peer's id
    this.props.hm._messagePeer(peer, {type: 'hi', id: this.props.id});
  }

  componentDidMount() {
    this.props.hm.on('peer:message', (actorId, peer, msg) => {
      if (msg.type === 'hi') {
        this.registerPeer(peer, msg);
      }
    });

    this.props.hm.on('peer:joined', (actorId, peer) => {
      this.registerWithPeer(peer);
    });

    this.props.hm.on('peer:left', (actorId, peer) => {
      if (this.state.doc && peer.remoteId) {
        // remove the leaving peer from the editor
        let id = peer.remoteId.toString('hex');
        id = this.state.peerIds[id];
        this.state.doc.leave(id);
      }
    });

    // remove self when closing window
    window.onbeforeunload = () => {
      this.state.doc.leave(this.props.id);
    }

    this.props.hm.on('document:updated', () => {
      this.updateDocsList();
    });

    this.props.hm.on('document:ready', () => {
      this.updateDocsList();
    });
  }

  onDocumentReady(doc) {
    doc.join(this.props.id, this.state.name, this.state.color);
    doc.on('updated', (doc) => this.setState({ doc }));
    this.setState({ doc });
  }

  createDocument() {
    let doc = HyperDoc.new();
    doc.once('ready', this.onDocumentReady.bind(this));
  }

  selectDocument(selected) {
    let docId = selected.value;
    this.openDocument(docId);
  }

  openDocument(docId) {
    try {
      let doc = HyperDoc.open(docId);
      if (doc.ready) {
        this.onDocumentReady(doc);
      } else {
        doc.once('ready', this.onDocumentReady.bind(this));
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

  onEditName(ev) {
    let name = ev.target.value;
    if (name && this.state.doc) {
      this.state.doc.setName(this.props.id, name);
      this.setState({ name: name });
    }
  }

  export() {
    let fname = `${this.state.doc.title}.txt`;
    let text = this.state.doc.text;
    let el = document.createElement('a');
    el.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`);
    el.setAttribute('download', fname);
    el.style.display = 'none';
    document.body.appendChild(el);
    el.click();
    document.body.removeChild(el);
  }

  render() {
    let main;
    if (this.state.doc) {
      main = (
        <div id='doc'>
          <InlineEditable
            className='doc-title'
            value={this.state.doc.title}
            onEdit={(title) => this.state.doc.title = title} />
          <div>{this.state.doc.nPeers} peers</div>
          <Doc id={this.props.id} doc={this.state.doc} />
          <div className='doc-id'>Copy to share: <span>{this.state.doc.id}</span></div>
          <div className='doc-misc'>
            <button onClick={this.export.bind(this)}>Save as text</button>
          </div>
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
              return <li key={d.value}>
                <a onClick={() => this.openDocument(d.value)}>{d.label}</a>
              </li>;
            })}
          </ul>
        </div>
      );
    }

    return <main role='main'>
      <nav>
        <button onClick={this.createDocument.bind(this)}>Create new document</button>
        <input
          type='text'
          placeholder='Name'
          className='app-name'
          value={this.state.name}
          onChange={this.onEditName.bind(this)} />
        <Creatable
          style={{width: '12em'}}
          placeholder='Open document'
          options={this.state.docs}
          onChange={this.selectDocument.bind(this)}
          promptTextCreator={(label) => `Open '${shrinkId(label)}'`}
        />
      </nav>
      {main}
    </main>
  }
}

export default App;
