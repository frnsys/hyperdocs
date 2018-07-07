import React, {Component} from 'react';
import {Editor, EditorState, RichUtils, Modifier, convertFromRaw, convertToRaw, SelectionState} from 'draft-js';
import 'draft-js/dist/Draft.css';
import update from 'immutability-helper';

/*
// submit new content state to peers
let content = convertToRaw(editorState.getCurrentContent());
let lastChangeType = editorState.lastChangeType;

// get new contentStates from peers
// and push to local editor state
contentState = convertFromRaw(content);
EditorState.push(
  editorState,  // local
  contentState, // from peer
  lastChangeType // from peer
);
// this should automatically keep undo/redo stacks more or less synchronized
// TODO does this automatically adjust local selection state?

// [WORKING LOCALLY]
// send selection state to peers
// just need enough info to render highlight
// <https://draftjs.org/docs/api-reference-selection-state.html>
// TODO
// just need:
// let selection = editorState.getSelection();
// let startKey = selection.getStartKey();
// let startOffset = selection.getStartOffset();
// let endKey = selection.getEndKey();
// let endOffset = selection.getEndOffset();

// [WORKING LOCALLY]
// render peer selection states locally, with scrolling
// could create a clone of the EditorState with a special inline style for each peer, and insert those as inline styles, e.g.
// let hiState = EditorState.forceSelection(editorState, peerSelectionState);
// hiState = RichUtils.toggleInlineStyle(hiState, inlineStyle='francis');
// <Editor editorState={hiState} readonly />
// and make so it receives no pointer events. then I think we can basically just render it on top? hard to believe it'd be that simple though.
// not sure how performant this is though

// anchor and update comment positions, with scrolling
// do highlighting as with peer selection.
// TODO updating comment positions is trickier...we need diffs...

// for style UI:
// <https://draftjs.org/docs/quickstart-rich-styling.html>
*/

function applyInlineStyle(state, selection, style) {
  let sel = new SelectionState({
    anchorKey: selection.start.key,
    anchorOffset: selection.start.offset,
    focusKey: selection.end.key,
    focusOffset: selection.end.offset
  });
  let content = state.getCurrentContent();
  let newContent = Modifier.applyInlineStyle(content, sel, style);
  return EditorState.push(state, newContent, 'change-inline-style');
}

const styleMap = {
  'FRANCIS': {
    backgroundColor: 'green',
    opacity: 0.2
  },
  'COMMENT': {
    backgroundColor: 'blue',
    opacity: 0.2
  },
};

class RichEditor extends Component {
  constructor(props) {
    super(props);
    let empty = EditorState.createEmpty();
    this.state = {
      editorState: empty,
      highlightState: empty,
      commentState: empty,
      comments: []
    };

    this.onChange = (editorState) => {
      // render peer selections
      const sel = editorState.getSelection();
      let highlightState = editorState;
      let peerSelection = {
        start: {
          key: sel.getStartKey(),
          offset: sel.getStartOffset()
        },
        end: {
          key: sel.getEndKey(),
          offset: sel.getEndOffset()
        }
      };
      highlightState = applyInlineStyle(highlightState, peerSelection, 'FRANCIS');

      // render comment selections
      let commentState = editorState;
      this.state.comments.forEach((c, i) => {
        commentState = applyInlineStyle(commentState, c, 'COMMENT');
      });
      this.setState({editorState, highlightState, commentState});
    };

    this.editor = React.createRef();
    this.handleKeyCommand = this.handleKeyCommand.bind(this);
  }

  componentDidMount() {
    this.editor.current.focus();
  }

  handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      this.onChange(newState);
      return 'handled';
    }
    return 'not-handled';
  }

  addComment(ev) {
    let sel = this.state.editorState.getSelection();
    let comments = this.state.comments;
    comments.push({
      start: {
        key: sel.getStartKey(),
        offset: sel.getStartOffset()
      },
      end: {
        key: sel.getEndKey(),
        offset: sel.getEndOffset()
      }
    });
    this.setState({ comments });
    this.onChange(this.state.editorState);
  }

  render() {
    let bg = '#fff';

    return (
      <div>
        <div style={{background: bg}}>
          <div style={{position: 'absolute', pointerEvents: 'none', color: bg}}>
            <Editor
              readOnly={true}
              customStyleMap={styleMap}
              editorState={this.state.highlightState} />
          </div>
          <div style={{position: 'absolute', pointerEvents: 'none', color: bg, zIndex: 1}}>
            <Editor
              readOnly={true}
              customStyleMap={styleMap}
              editorState={this.state.commentState} />
          </div>
          <Editor
            ref={this.editor}
            handleKeyCommand={this.handleKeyCommand}
            editorState={this.state.editorState}
            onChange={this.onChange} />
        </div>
        <button onClick={this.addComment.bind(this)}>Add Comment</button>
      </div>
    );
  }
}

export default RichEditor;
