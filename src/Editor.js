import React, {Component} from 'react';
import getCaretCoordinates from 'textarea-caret';


class Editor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectionStart: 0,
      selectionEnd: 0
    };
    this.textarea = React.createRef();
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

    this.setState({
      selectionStart: textarea.selectionStart,
      selectionEnd: textarea.selectionEnd,
      caretPos: caretPos
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

  onScroll() {
    this.props.onScroll(this.textarea.current.scrollTop);
  }

  focus() {
    this.textarea.current.focus();
  }

  render() {
    return <textarea
      ref={this.textarea}
      value={this.props.text}
      className='doc-editor-textarea'
      onSelect={this.onSelect.bind(this)}
      onScroll={this.onScroll.bind(this)}
      onChange={this.onChange.bind(this)}></textarea>;
  }
}

export default Editor;
