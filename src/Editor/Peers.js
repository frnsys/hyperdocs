import React from 'react';


const localStyle = {
  background: 'rgba(0,0,255,0.2)'
};

// TODO do this per-peer
const remoteStyle = {
  position: 'relative',
  background: 'rgba(0,255,0,0.2)'
};

const cursorStyle = {
  width: '2px',
  background: 'rgba(0,255,0,0.6)',
  height: '1em',
  display: 'inline-block',
  position: 'absolute',
  top: '0px',
  right: '-1px'
};


function Peers(opts) {
  const { localId } = opts;
  const localMark = {
    data: { peerId: localId },
    type: 'peer'
  };
  let lastSelection;

  function onChange(change) {
    let { selection } = change.value;
    if ((selection == lastSelection) || (selection.isCollapsed && (lastSelection && lastSelection.isCollapsed))) return;
    if (lastSelection) {
      change = change.removeMarkAtRange(lastSelection, localMark);
    }
    if (!selection.isCollapsed) {
      change.addMark(localMark);
    }
    lastSelection = selection;
  }

  function onBlur(event, change, editor) {
    let { selection } = change.value;
    if (selection.isCollapsed) return;
    change.addMark(localMark);
  }

  function onFocus(event, change, editor) {
    change.removeMark(localMark);
  }

  const renderMark = (props) => {
    let { mark } = props;
    if (mark.type === 'peer') {
      let isMe = mark.data.get('peerId') == localId;
      let style = isMe ? localStyle : remoteStyle;
      return <span style={style}>{props.children}</span>;
    }
  }

  return { onFocus, onBlur, onChange, renderMark };
};

export default Peers;
