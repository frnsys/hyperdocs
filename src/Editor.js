import Peer from './Peer';
import Highlight from './Highlight';
import Automerge from 'automerge';
import React, {Component} from 'react';
import ReactMarkdown from 'react-markdown';
import getCaretCoordinates from 'textarea-caret';


// TODO should use a binary tree
function commentForCaret(comments, start, end) {
  return comments.find((c) => c.start <= start && c.end >= end);
}




class AddComment extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: ''
    };
  }

  addComment() {
    this.props.addComment(this.state.value);

    // TODO ideally this doesn't happen until
    // we confirm the comment registered...
    this.setState({value: ''});
  }

  render() {
    return (
      <div className='doc-comment'>
        <textarea value={this.state.value} onChange={(ev) => this.setState({value: ev.target.value})} />
        <button onClick={this.addComment.bind(this)}>Add comment</button>
      </div>);
  }
}

class Comments extends Component {
  render() {
    // TODO styling/positioning needs a lot of work
    let style = {
      top: this.props.top
    };

    if (this.props.focused) {
      style.border = '2px solid #7070ff';
    } else {
      style.display = 'none';
    }

    return (
      <div className='doc-comments' style={style}>
        {this.props.thread.length > 0 &&
          <button className='doc-comment-resolve' onClick={this.props.resolveComment}>Resolve</button>}
        {this.props.thread.map((c) => {
          return (
            <div key={`${c.author}_${c.created}`} className='doc-comment'>
              <div className='doc-comment-author'>{c.author}</div>
              <div className='doc-comment-body'>{c.body}</div>
              <div className='doc-comment-datetime'>On {new Date(c.created).toLocaleString()}</div>
            </div>);
        })}
        <AddComment addComment={this.props.addComment} />
      </div>);
  }
}


class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollTop: 0,
      preview: false,
      focusedComment: null
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
            start++;
          } else if (d.action === 'remove') {
            start--;
          }
        }

        if (d.index < end) {
          if (d.action === 'insert') {
            end++;
          } else if (d.action === 'remove') {
            end--;
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
    let caretPos = {
      start: getCaretCoordinates(textarea, textarea.selectionStart),
      end: getCaretCoordinates(textarea, textarea.selectionEnd)
    };
    let caretIdx = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };

    // find focused comment, if any
    let focusedComment = commentForCaret(Object.values(this.props.comments), textarea.selectionStart, textarea.selectionEnd);

    this.setState({
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
      caretPos: caretPos,
      focusedComment: focusedComment ? focusedComment.id : null
    });

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
      let addComment = '';
      if (this.textarea.current && this.textarea.current.selectionStart !== this.textarea.current.selectionEnd) {
        let top = getCaretCoordinates(this.textarea.current, this.textarea.current.selectionStart).top;
        if (!commentForCaret(Object.values(this.props.comments), this.textarea.current.selectionStart, this.textarea.current.selectionEnd)) {
          addComment = <Comments key='new' top={top} focused={true} thread={[]} addComment={(body) => {
            this.props.addComment(null, body, this.textarea.current.selectionStart, this.textarea.current.selectionEnd);
            this.textarea.current.focus();
          }} />;
        }
      }
      main = (
        <div className='doc-editor'>
          <div className='doc-overlay' style={{top: - this.state.scrollTop}}>
            {Object.keys(this.props.comments).map((id) => {
              let c = this.props.comments[id];
              if (c.resolved) return;

              let top = 0;
              if (this.textarea.current) {
                top = getCaretCoordinates(this.textarea.current, c.start).top;
              }
              return <Comments key={id}
                      top={top}
                      resolveComment={() => this.props.resolveComment(id)}
                      addComment={(body) => this.props.addComment(id, body)}
                      focused={id === this.state.focusedComment}
                      thread={c.thread} />;
            })}
            {addComment}
          </div>
          <div className='doc-editor-constrained'>
            <div className='doc-overlay' style={{position: 'absolute', top: - this.state.scrollTop}}>
              {Object.keys(this.props.comments).map((id) => {
                // TODO this could be based on thread author,
                // or fixed for all comments
                let color = 'blue';
                let c = this.props.comments[id];
                if (c.resolved) return;
                return <Highlight
                  key={id}
                  text={this.props.text}
                  start={c.start}
                  end={c.end}
                  color={color} />;
              })}

              {Object.values(this.props.peers).map((p) => {
                if (p.id === this.props.id) return;
                if (!p.pos) return;
                console.log(p.id);
                return <Peer key={p.id} peer={p} text={this.props.text} />;
              })}
            </div>
            <textarea
              ref={this.textarea}
              value={this.props.text}
              className='doc-editor-textarea'
              onKeyDown={this.onKeyPress.bind(this)}
              onSelect={this.onSelect.bind(this)}
              onScroll={this.onScroll.bind(this)}
              onChange={this.onChange.bind(this)}></textarea>
          </div>
        </div>);
    }

    return <div id='editor'>{main}</div>;
  }
}

export default Editor;
