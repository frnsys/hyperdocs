import Peer from './Peer';
import Editor from './Editor';
import Comments from './Comments';
import Highlight from './Highlight';
import React, {Component} from 'react';

function isImage(file) {
  let validTypes = ['image/gif', 'image/jpeg', 'image/png'];
  return validTypes.indexOf(file.type) >= 0;
}


class ImageUpload extends Component {
  constructor(props) {
    super(props);
    this.input = React.createRef();
  }

  handleFileUpload(ev) {
    let files = ev.target.files;
    if (files && files[0]) {
      let file = files[0];
      if (isImage(file)) {
        this.props.onImage(file);
      }
    }
  }

  render() {
    return <div>
      <button onClick={() => this.input.current.click()}>Upload image</button>
      <input
        type='file'
        ref={this.input}
        style={{display: 'none'}}
        onChange={this.handleFileUpload.bind(this)} />
    </div>;
  }
}


class Doc extends Component {
  constructor(props) {
    super(props);
    this.state = {
      scrollTop: 0,
      focusedComment: null
    };
    this.editor = React.createRef();
  }

  onScroll(scrollTop) {
    this.setState({ scrollTop });
  }

  onSelect(caretPos, caretIdx) {
    // find focused comment, if any
    let comments = Object.values(this.props.doc.comments);
    let focusedComment = comments.find((c) => c.start <= caretIdx.start && c.end >= caretIdx.end);

    this.setState({
      caretPos: caretPos,
      caretIdx: caretIdx,
      addNewComment: !focusedComment && caretIdx.start != caretIdx.end,
      focusedComment: focusedComment ? focusedComment.id : null
    });

    this.props.doc.setSelection(this.props.id, caretPos, caretIdx);
  }

  onImage(file) {
    let reader = new FileReader();
    reader.addEventListener('load', (e) => {
      this.props.doc.addImage(e.target.result);
    });
    reader.readAsDataURL(file);
  }

  onDrop(ev) {
    ev.stopPropagation();
    ev.preventDefault();
    let files = Array.from(ev.dataTransfer.files);
    files.filter((f) => isImage(f)).map((f) => this.onImage(f));
  }

  render() {
    let text = this.props.doc.text;
    let peers = Object.values(this.props.doc.peers).filter((p) => p.id !== this.props.id && p.pos);
    let activeComments = Object.values(this.props.doc.comments).filter((c) => !c.resolved);

    let caretTop = this.state.caretPos ? this.state.caretPos.start.top : 0;
    let addComment = <Comments top={caretTop} focused={true} thread={[]} add={(_, body) => {
      if (body) {
        let { start, end } = this.state.caretIdx;
        this.props.doc.addComment(this.props.id, null, body, start, end);
        this.editor.current.focus();
      }
    }} />;

    return <div id='editor'>
      <div className='doc-editor' onDrop={this.onDrop.bind(this)}>
        <div className='doc-overlay' style={{top: -this.state.scrollTop}}>
          {activeComments.map((c) => {
            let focused = c.id === this.state.focusedComment;
            return <Comments
              key={c.id}
              top={caretTop}
              focused={focused}
              doc={this.props.doc}
              add={(id, body) => this.props.doc.addComment(this.props.id, id, body)}
              resolve={() => this.props.doc.resolveComment(c.id)}
              {...c} />
          })}
          {this.state.addNewComment && addComment}
        </div>
        <div className='doc-editor-constrained'>
          <div className='doc-overlay' style={{position: 'absolute', top: -this.state.scrollTop}}>
            {activeComments.map((c) => {
              return <Highlight key={c.id} text={text} start={c.start} end={c.end} color='blue' />;
            })}
            {peers.map((p) => <Peer key={p.id} peer={p} text={text} />)}
          </div>
        <Editor
          ref={this.editor}
          text={this.props.doc.text}
          diffs={this.props.doc.diffs}
          onScroll={this.onScroll.bind(this)}
          onSelect={this.onSelect.bind(this)}
          onEdit={(edits) => this.props.doc.editText(edits)} />
        <ImageUpload onImage={this.onImage.bind(this)} />
        <div>
          <h2>Images</h2>
          {Object.keys(this.props.doc.images).map((id) => {
            let b64 = this.props.doc.images[id];
            return <img key={id} src={b64} />;
          })}
        </div>
      </div>
      </div>
    </div>;
  }
}

export default Doc;
