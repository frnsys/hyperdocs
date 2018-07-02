import {render} from 'react-dom';
import Automerge from 'automerge';
import Hypermerge from 'hypermerge';
import React, {Component} from 'react';
import ram from 'random-access-memory';
import getCaretCoordinates from 'textarea-caret';
import ReactMarkdown from 'react-markdown';
import { Creatable } from 'react-select';
import 'react-select/dist/react-select.css';

// const path = 'docs';
const path = ram;

const colors = [
  '#1313ef',
  '#ef1321',
  '#24b554',
  '#851fd3',
  '#0eaff4',
  '#edc112',
  '#7070ff'
];


function shrinkId(id) {
  if (id.length <= 12) return id;
  let front = id.substring(0, 6);
  let end = id.substring(id.length - 6);
  return `${front}...${end}`;
}


class InlineEditable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false
    };
    this.input = React.createRef();
  }

  onKeyPress(ev) {
    if (ev.key === 'Enter') {
      this.props.onEdit(ev.target.value);
      this.setState({ editing: false });
    }
  }

  onBlur(ev) {
    this.props.onEdit(ev.target.value);
    this.setState({ editing: false });
  }

  onClick() {
    this.setState({ editing: true });
  }

  componentDidUpdate() {
    if (this.input.current) {
      this.input.current.focus();
    }
  }

  render() {
    if (this.state.editing) {
      return <input
        type='text'
        className={this.props.className}
        defaultValue={this.props.value}
        onKeyPress={this.onKeyPress.bind(this)}
        onBlur={this.onBlur.bind(this)}
        ref={this.input} />
    } else {
      return <div className={this.props.className} onClick={this.onClick.bind(this)}>{this.props.value}</div>;
    }
  }
}

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      doc: null,
      name: '',
      peers: [],
      docs: [],
      peerIds: {}
    };
  }

  componentDidMount() {
    hm.on('peer:message', (actorId, peer, msg) => {
      if (msg.type === 'hi') {
        let peerIds = this.state.peerIds;
        let id = peer.remoteId.toString('hex');
        peerIds[id] = msg.id;
      }
    });

    hm.on('peer:joined', (actorId, peer) => {
      hm._messagePeer(peer, {type: 'hi', id: this.props.id});
      this.setState({ peers: this.uniquePeers(this.state.doc) });
    });

    hm.on('peer:left', (actorId, peer) => {
      if (this.state.doc && peer.remoteId) {
        this.setState({ peers: this.uniquePeers(this.state.doc) });
        let id = peer.remoteId.toString('hex');
        id = this.state.peerIds[id];
        let changedDoc = hm.change(this.state.doc, (changeDoc) => {
          delete changeDoc.peers[id];
        })
        this.setState({ doc: changedDoc });
      }
    });

    hm.on('document:updated', (docId, doc, prevDoc) => {
      this.setState({ doc });
      this.updateDocs();
    });

    hm.on('document:ready', () => {
      this.updateDocs();
    });
  }

  createNewDocument() {
    hm.create();
    hm.once('document:ready', (docId, doc) => {
      let changedDoc = hm.change(doc, (changeDoc) => {
        changeDoc.text = new Automerge.Text();
        changeDoc.title = 'Untitled';
        changeDoc.peers = {};
        changeDoc.peers[this.props.id] = {
          name: this.state.name
        };
      })
      this.setState({ doc: changedDoc });
      this.updateDocs();
    });
  }

  updateDocs() {
    let docs = Object.keys(hm.docs).map((docId) => {
      return { value: docId, label: hm.docs[docId].title };
    }).filter((d) => d.label);
    this.setState({ docs });
  }

  onSelectDoc(selected) {
    let docId = selected.value;
    try {
      if (hm.has(docId)) {
        let doc = hm.find(docId);
        this.setState({ doc: doc, peers: this.uniquePeers(doc) });
      } else {
        hm.open(docId);
        hm.once('document:ready', (docId, doc) => {
          doc = hm.change(doc, (changeDoc) => {
            changeDoc.peers[this.props.id] = {
              name: this.state.name
            };
          });
          this.setState({ doc: doc, peers: this.uniquePeers(doc) });
        });
      }
    } catch(e) {
      console.log(e);
    }
  }

  onEdit(edits) {
    let doc = hm.change(this.state.doc, (changeDoc) => {
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
      let doc = hm.change(this.state.doc, (changeDoc) => {
        changeDoc.title = title;
      });
      this.setState({ doc });
      this.updateDocs();
    }
  }

  onEditName(ev) {
    let name = ev.target.value;
    if (name && this.state.doc) {
      let doc = hm.change(this.state.doc, (changeDoc) => {
        changeDoc.peers[this.props.id].name = name;
      });
      this.setState({ doc });
    }
    this.setState({ name });
  }

  onEditSelect(caretPos, caretIdx) {
    // update peers about caret position
    let doc = hm.change(this.state.doc, (changeDoc) => {
      changeDoc.peers[this.props.id].pos = caretPos;
      changeDoc.peers[this.props.id].idx = caretIdx;
    });
    this.setState({ doc });
  }

  uniquePeers(doc) {
    if (doc) {
      let peers = hm.feeds[hm.getId(doc)].peers;
      return [...new Set(peers.filter((p) => p.remoteId).map(p => p.remoteId.toString('hex')))];
    }
    return [];
  }

  render() {
    return <main role='main'>
      <nav>
        <button onClick={this.createNewDocument.bind(this)}>Create new document</button>
        <input placeholder='Name' type='text' className='doc-name' value={this.state.name} onChange={this.onEditName.bind(this)} />
        <Creatable
          style={{width: '12em'}}
          placeholder='Open document'
          onChange={this.onSelectDoc.bind(this)}
          options={this.state.docs}
          promptTextCreator={(label) => `Open '${shrinkId(label)}'`}
        />
      </nav>
      {this.state.doc && <InlineEditable className='doc-title' value={this.state.doc.title} onEdit={this.onEditTitle.bind(this)} />}
      {this.state.doc && <div>{this.state.peers.length} peers</div>}
      {this.state.doc && <Editor id={this.props.id} doc={this.state.doc} onEdit={this.onEdit.bind(this)} onSelect={this.onEditSelect.bind(this)} />}
    </main>
  }
}

class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.doc.text.join(''),
      preview: false
    };
    this.textarea = React.createRef();
    this.preview = React.createRef();
  }

  componentDidMount() {
    this.textarea.current.focus();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.doc !== this.props.doc) {
      this.setState({ value: this.props.doc.text.join('') });
    }
    if (prevState.preview !== this.state.preview) {
      if (this.state.preview) {
        this.preview.current.focus();
      } else {
        this.textarea.current.focus();
      }
    }
  }

  onSelect(ev) {
    let textarea = this.textarea.current;
    this.setState({
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd
    });

    // update caret position
    let caretPos = {
      start: getCaretCoordinates(textarea, textarea.selectionStart),
      end: getCaretCoordinates(textarea, textarea.selectionEnd)
    };
    let caretIdx = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
    this.props.onSelect(caretPos, caretIdx);
  }

  onChange(ev) {
    // track insertions & deletions by character
    let edits = [];
    let caret = this.textarea.current.selectionEnd;
    let newText = ev.target.value;
    let prevText = this.state.value;
    let diff = newText.length - prevText.length;
    let inserted = diff > 0;
    diff = Math.abs(diff);

    // check if selected & replaced,
    // which needs to be split into two operations
    let selectedDiff = this.state.selectionEnd - this.state.selectionStart;
    if (selectedDiff && selectedDiff !== diff) {
      let adjCaret = caret-(selectedDiff-diff);
      let removed = prevText.substr(adjCaret, selectedDiff);
      edits.push({
        caret: adjCaret,
        diff: selectedDiff,
        inserted: inserted,
        changed: removed
      });
      console.log(`removed ${selectedDiff} characters: ${removed}`);

      prevText = `${prevText.substr(0, adjCaret)}${prevText.substr(adjCaret+selectedDiff)}`;
      diff = newText.length - prevText.length;
      inserted = true;
    }

    let changed;
    if (inserted) {
      caret = caret - diff;
      changed = newText.substr(caret, diff);
      console.log(`inserted ${diff} characters: ${changed}`);
    } else {
      changed = prevText.substr(caret, diff);
      console.log(`removed ${diff} characters: ${changed}`);
    }
    edits.push({
      caret: caret,
      diff: diff,
      inserted: inserted,
      changed: changed
    });
    this.props.onEdit(edits);
    this.setState({value: ev.target.value });
  }

  onKeyPress(ev) {
    if (ev.key === 'p' && ev.ctrlKey) {
      this.setState({ preview: !this.state.preview });
      ev.preventDefault();
    }
  }

  render() {
    let main;
    if (this.state.preview) {
      main = <div
        ref={this.preview}
        className='doc-preview'
        tabIndex='-1'
        onKeyDown={this.onKeyPress.bind(this)}>
        <ReactMarkdown source={this.state.value} />
        <div className='doc-preview-label'>Preview</div>
      </div>;
    } else {
      main = (
        <div>
          {Object.keys(this.props.doc.peers).map((id) => {
            // show peer caret positions
            if (id === this.props.id) return;
            let peer = this.props.doc.peers[id];
            let pos = peer.pos.end;
            let idx = peer.idx;
            let color = colors[parseInt(id, 16) % colors.length];
            let style = {
              position: 'absolute',
              background: color,
              left: pos.left
            };

            let highlight = '';
            if (idx.start !== idx.end) {
              let text = this.state.value;
              let start = text.substr(0, idx.start);
              let highlighted = text.substring(idx.start, idx.end);
              let end = text.substr(idx.end);
              highlight = <div className='highlights'><span className='highlight-text'>{start}</span><span className='highlight' style={{background: color}}><span className='highlight-text'>{highlighted}</span></span><span className='highlight-text'>{end}</span></div>;
            }
            let name = peer.name ? peer.name : id.substr(0, 6);
            return (
              <div key={id}>
                <div className='peer-label' style={{top: pos.top, ...style}}>{name}</div>
                <div className='peer-cursor' style={{top: pos.top + pos.height, ...style}}></div>
                {highlight}
              </div>);
          })}
          <textarea
            ref={this.textarea}
            value={this.state.value}
            onKeyDown={this.onKeyPress.bind(this)}
            onSelect={this.onSelect.bind(this)}
            onChange={this.onChange.bind(this)}></textarea>
        </div>);
    }

    return (
      <div id='editor'>
        {main}
        <div className='doc-id'>Copy to share: <span>{hm.getId(this.props.doc)}</span></div>
      </div>
    );
  }
}

const hm = new Hypermerge({
  path: path
});

hm.once('ready', (hm) => {
  hm.joinSwarm({utp: false}); // getting an error with utp?

  // TODO not sure if this is the best id to use,
  // since it doesn't seem like peers have access to it
  let id = hm.swarm.id.toString('hex');
  let main = document.getElementById('main');
  render(<App id={id} />, main);
});
