import {render} from 'react-dom';
import Automerge from 'automerge';
import Hypermerge from 'hypermerge';
import React, {Component} from 'react';
import ram from 'random-access-memory';

class InlineEditable extends Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
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
      doc: null
    };
  }

  componentDidMount() {
    hm.on('peer:joined', (actorId, peer) => {
      // console.log('peer joined');
    });

    hm.on('peer:left', (actorId, peer) => {
      // console.log('peer left');
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
        this.setState({ doc: doc });
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

  render() {
    return <main role='main'>
      <nav>
        <button onClick={this.createNewDocument.bind(this)}>Create new document</button>
        <input onKeyPress={this.onKeyPress.bind(this)} type='text' placeholder='Open document' />
      </nav>
      {this.state.doc && <InlineEditable className='doc-title' value={this.state.doc.title} onEdit={this.onEditTitle.bind(this)} />}
      {this.state.doc && <Editor doc={this.state.doc} onEdit={this.onEdit.bind(this)} />}
    </main>
  }
}

class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: props.doc.text.join('')
    };
    this.textarea = React.createRef();
  }

  componentDidMount() {
    this.textarea.current.focus();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.doc !== this.props.doc) {
      this.setState({ value: this.props.doc.text.join('') });
    }
  }

  onSelect(ev) {
    let textarea = this.textarea.current;
    this.setState({
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd
    });
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

  render() {
    return (
      <div id='editor'>
        <textarea
          ref={this.textarea}
          value={this.state.value}
          onSelect={this.onSelect.bind(this)}
          onChange={this.onChange.bind(this)}></textarea>
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
  let main = document.getElementById('main');
  render(<App />, main);
});
