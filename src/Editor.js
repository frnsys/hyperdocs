import Automerge from 'automerge';
import React, {Component} from 'react';
import ReactMarkdown from 'react-markdown';
import getCaretCoordinates from 'textarea-caret';


class Peer extends Component {
  render() {
    let peer = this.props.peer;
    let color = this.props.color;

    let pos = peer.pos.end;
    let style = {
      position: 'absolute',
      background: color,
      left: pos.left
    };

    let idx = peer.idx;
    let highlight = '';
    if (idx.start !== idx.end) {
      let text = this.props.text;
      let start = text.substr(0, idx.start);
      let highlighted = text.substring(idx.start, idx.end);
      let end = text.substr(idx.end);

      // bleh cleanup
      highlight = <div className='highlights' style={{top: -this.props.offsetTop}}><span className='highlight-text'>{start}</span><span className='highlight' style={{background: color}}><span className='highlight-text'>{highlighted}</span></span><span className='highlight-text'>{end}</span></div>;
    }

    let top = pos.top - this.props.offsetTop;

    let name = peer.name ? peer.name : this.props.id.substr(0, 6);
    return (
      <div>
        <div className='peer-label' style={{top: top - pos.height, ...style}}>{name}</div>
        <div className='peer-cursor' style={{top: top, ...style}}></div>
        {highlight}
      </div>);
  }
}


class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollTop: 0,
      preview: false
    };
    this.textarea = React.createRef();
    this.preview = React.createRef();
  }

  componentDidMount() {
    this.textarea.current.focus();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.text !== this.props.text && this.props.diffs.length) {
      // only adjust cursor if text has changed
      // from our perspective.
      // if it hasn't, we assume we made the
      // changes and our caret has automatically updated.
      let start = this.state.selectionStart;
      let end = this.state.selectionEnd;
      this.props.diffs.forEach((d) => {
        if (d.index < start) {
          if (d.action === 'insert') {
            start += 1;
          } else if (d.action === 'remove') {
            start -= 1;
          }
        }

        if (d.index < end) {
          if (d.action === 'insert') {
            end += 1;
          } else if (d.action === 'remove') {
            end -= 1;
          }
        }
      });
      this.textarea.current.selectionStart = start;
      this.textarea.current.selectionEnd = end;
      this.onSelect();
    }

    // focus textarea/preview if just changed
    if (prevState.preview !== this.state.preview) {
      if (this.state.preview) {
        this.preview.current.focus();
      } else {
        this.textarea.current.focus();
      }
    }
  }

  onSelect(ev) {
    // on new textarea selection/caret movement,
    // update peers
    let textarea = this.textarea.current;
    this.setState({
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd
    });

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
    // track insertions & deletions by character,
    // this is what hypermerge/automerge requires
    let edits = [];
    let caret = this.textarea.current.selectionEnd;
    let newText = ev.target.value;
    let prevText = this.props.text;
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
      // console.log(`removed ${selectedDiff} characters: ${removed}`);

      prevText = `${prevText.substr(0, adjCaret)}${prevText.substr(adjCaret+selectedDiff)}`;
      diff = newText.length - prevText.length;
      inserted = true;
    }

    let changed;
    if (inserted) {
      caret = caret - diff;
      changed = newText.substr(caret, diff);
      // console.log(`inserted ${diff} characters: ${changed}`);
    } else {
      changed = prevText.substr(caret, diff);
      // console.log(`removed ${diff} characters: ${changed}`);
    }
    edits.push({
      caret: caret,
      diff: diff,
      inserted: inserted,
      changed: changed
    });
    this.props.onEdit(edits);
  }

  onKeyPress(ev) {
    // toggle markdown preview mode
    if (ev.key === 'p' && ev.ctrlKey) {
      this.setState({ preview: !this.state.preview });
      ev.preventDefault();
    }
  }

  onScroll() {
    this.setState({
      scrollTop: this.textarea.current.scrollTop
    });
  }

  render() {
    let main;
    if (this.state.preview) {
      main = <div
        ref={this.preview}
        className='doc-preview'
        tabIndex='-1'
        onKeyDown={this.onKeyPress.bind(this)}>
        <ReactMarkdown source={this.props.text} />
        <div className='doc-preview-label'>Preview</div>
      </div>;
    } else {
      main = (
        <div className='doc-editor'>
          {Object.keys(this.props.peers).map((id) => {
            // show peer caret positions
            if (id === this.props.id) return;
            let peer = this.props.peers[id];
            if (!peer.pos) return;
            let color = this.props.colors[parseInt(id, 16) % this.props.colors.length];
            return <Peer key={id} id={id} peer={peer} color={color} text={this.props.text} offsetTop={this.state.scrollTop} />;
          })}
          <textarea
            ref={this.textarea}
            value={this.props.text}
            onKeyDown={this.onKeyPress.bind(this)}
            onSelect={this.onSelect.bind(this)}
            onScroll={this.onScroll.bind(this)}
            onChange={this.onChange.bind(this)}></textarea>
        </div>);
    }

    return <div id='editor'>{main}</div>;
  }
}

export default Editor;
