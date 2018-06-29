import {render} from 'react-dom';
import Automerge from 'automerge';
import Hypermerge from 'hypermerge';
import React, {Component} from 'react';
import ram from 'random-access-memory';
import getCaretCoordinates from 'textarea-caret';
import ReactMarkdown from 'react-markdown';

const colors = [
  '#1313ef',
  '#ef1321',
  '#24b554',
  '#851fd3',
  '#0eaff4',
  '#edc112',
  '#7070ff'
];

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
      peers: []
    };
  }

  componentDidMount() {
    hm.on('peer:joined', (actorId, peer) => {
      this.setState({ peers: this.uniquePeers(this.state.doc) });
    });

    hm.on('peer:left', (actorId, peer) => {
      if (this.state.doc) {
        this.setState({ peers: this.uniquePeers(this.state.doc) });
        // TODO not sure how to recover same id we use for the cursors for deletion
        // the following is not the same id as hm.swarm.id used below
        // let id = peer.remoteId.toString('hex');
        // let changedDoc = hm.change(this.state.doc, (changeDoc) => {
        //   delete changeDoc.peers[id];
        // })
        // this.setState({ doc: changedDoc });
      }
    });

    hm.on('document:updated', (docId, doc, prevDoc) => {
      this.setState({ doc });
    });
  }

  createNewDocument() {
    hm.create();
    hm.once('document:ready', (docId, doc) => {
      let changedDoc = hm.change(doc, (changeDoc) => {
        changeDoc.text = new Automerge.Text();
        changeDoc.title = 'Untitled';
        changeDoc.peers = {};
      })
      this.setState({ doc: changedDoc });
    });
  }

  onKeyPress(ev) {
    if (ev.key === 'Enter') {
      let docId = ev.target.value;
      ev.target.value = '';
      hm.open(docId);
      hm.once('document:ready', (docId, doc) => {
        this.setState({ doc: doc, peers: this.uniquePeers(doc) });
      });
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
    let doc = hm.change(this.state.doc, (changeDoc) => {
      changeDoc.title = title;
    });
    this.setState({ doc });
  }

  onEditSelect(caretPos) {
    let doc = hm.change(this.state.doc, (changeDoc) => {
      changeDoc.peers[this.props.id] = caretPos;
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
        <input onKeyPress={this.onKeyPress.bind(this)} type='text' placeholder='Open document' />
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
    let caretPos = getCaretCoordinates(textarea, textarea.selectionStart);
    this.props.onSelect(caretPos);
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
            if (id === this.props.id) return;
            let pos = this.props.doc.peers[id];
            let color = colors[parseInt(id, 16) % colors.length];
            let style = {
              position: 'absolute',
              background: color,
              left: pos.left
            };
            return (
              <div key={id}>
                <div className='peer-label' style={{top: pos.top, ...style}}>{id.substr(0, 6)}</div>
                <div className='peer-cursor' style={{top: pos.top + pos.height, ...style}}></div>
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
  path: ram
});

hm.once('ready', (hm) => {
  hm.joinSwarm({utp: false}); // getting an error with utp?
  // TODO not sure if this is the best id to use,
  // since it doesn't seem like peers have access to it
  let id = hm.swarm.id.toString('hex');
  let main = document.getElementById('main');
  render(<App id={id} />, main);
});
