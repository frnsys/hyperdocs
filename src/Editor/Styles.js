import React from 'react';
import isHotkey from 'is-hotkey';

const keysToMarks = {
  b: 'bold',
  i: 'italic',
  u: 'underline',
  k: 'code',
  '~': 'strikethrough',
};

const normalizedHotkeys = Object.entries(keysToMarks).map(([key, mark]) => ({
  triggerFn: isHotkey(key.indexOf('+') === -1 ? `mod+${key}` : key),
  mark,
}));

function Styles(opts) {
  function onKeyDown(event, change, editor) {
    const { mark: mark } = normalizedHotkeys.find(({ triggerFn }) => triggerFn(event)) || {};
    if (!mark) return;

    const startBlock = change.value.startBlock;
    if (!startBlock) return;

    event.preventDefault();
    change.toggleMark(mark);
  }

  const renderMark = (props) => {
    switch (props.mark.type) {
      case 'bold':
        return <strong>{props.children}</strong>;
      case 'code':
        return <code>{props.children}</code>;
      case 'italic':
        return <em>{props.children}</em>;
      case 'strikethrough':
        return <del>{props.children}</del>;
      case 'underline':
        return <u>{props.children}</u>;
    }
};

  return { onKeyDown, renderMark };
}

export default Styles;
